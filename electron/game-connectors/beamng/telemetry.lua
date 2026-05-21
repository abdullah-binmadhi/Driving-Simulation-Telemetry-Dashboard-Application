-- BeamNG.drive High-Fidelity Telemetry Bridge (v2.0)
-- Optimized for Tire PVT and JBeam Damage Monitor

local M = {}

local udp = socket.udp()
local target_ip = "127.0.0.1"
local target_port = 4440

local last_send_time = 0
local send_interval = 1/60 -- 60Hz
local estimated_tire_temps = {70, 70, 70, 70}

local function clamp(value, min_value, max_value)
    if type(value) ~= "number" or value ~= value then return min_value end
    return math.max(min_value, math.min(max_value, value))
end

local function firstNumber(...)
    for i = 1, select("#", ...) do
        local value = select(i, ...)
        if type(value) == "number" and value == value then
            return value
        end
    end
    return nil
end

-- Helper to find wheel by name
local function getWheelData(name)
    if not wheels or not wheels.wheels then return nil end

    if wheels.wheelIDs and wheels.wheelIDs[name] then
        local wheel = wheels.wheels[wheels.wheelIDs[name]]
        if wheel then return wheel end
    end

    for _, wd in pairs(wheels.wheels) do
        local wheel_name = string.upper(wd.name or "")
        if wheel_name == name or string.find(wheel_name, name) then return wd end
    end
    return nil
end

local function getPressurePsi(wd)
    local direct_psi = firstNumber(wd.pressurePSI, wd.pressurePsi, wd.tirePressurePSI, wd.tirePressurePsi)
    if direct_psi then return clamp(direct_psi, 0, 200) end

    local raw_pressure = firstNumber(wd.pressure, wd.tirePressure)
    if raw_pressure then
        if raw_pressure > 300 then
            return clamp(raw_pressure * 0.000145038, 0, 200)
        end
        return clamp(raw_pressure, 0, 200)
    end

    if wd.pressureGroup and v and v.data and v.data.pressureGroups and obj then
        local pressure_group = v.data.pressureGroups[wd.pressureGroup]
        if pressure_group then
            local ok, pressure_pa = pcall(function()
                return obj:getGroupPressure(pressure_group)
            end)
            if ok and type(pressure_pa) == "number" then
                return clamp(pressure_pa * 0.000145038, 0, 200)
            end
        end
    end

    return 0
end

local function estimateTireTemperature(index, wd, dt, speed_kmh, brake_input, steering_input, lat_g)
    local native_core = firstNumber(
        wd.tireCoreTemperature,
        wd.coreTemperature,
        wd.tireTemperature,
        wd.treadTemperature,
        wd.surfaceTemperature
    )

    if native_core and native_core > 0 and native_core ~= 70 then
        estimated_tire_temps[index] = clamp(native_core, -50, 250)
        return estimated_tire_temps[index]
    end

    local brake_core = firstNumber(wd.brakeCoreTemperature, wd.brakeSurfaceTemperature) or 90
    local heat_target =
        70
        + math.min(42, math.abs(lat_g) * 14)
        + math.min(24, math.abs(steering_input) * speed_kmh * 0.08)
        + math.min(28, brake_input * math.max(0, speed_kmh) * 0.12)
        + math.min(16, math.max(0, brake_core - 90) * 0.04)

    local old_temp = estimated_tire_temps[index] or 70
    local response = clamp((dt or 1/60) * 1.8, 0, 1)
    estimated_tire_temps[index] = clamp(old_temp + (heat_target - old_temp) * response, 40, 180)
    return estimated_tire_temps[index]
end

local function getDeviceHealth(device)
    if not device then return nil end
    if device.isCatastrophicallyFailed or device.isLockedUp or device.isBroken or device.isDisabled then
        return 0.0
    end

    local damage_level = firstNumber(device.damageLevel, device.wearLevel, device.damage, device.damageCoef)
    if damage_level then
        if damage_level > 1 then damage_level = damage_level / 100 end
        return clamp(1.0 - damage_level, 0, 1)
    end

    return nil
end

local function firstPowertrainDevice(devices)
    if type(devices) ~= "table" then return nil end
    for _, device in pairs(devices) do
        if type(device) == "table" then return device end
    end
    return nil
end

local function update(dt)
    local now = os.clock()
    if now - last_send_time < send_interval then return end
    last_send_time = now

    -- 1. Physics & Electrics
    local gear = electrics.values.gear or 0
    if gear == 0 and electrics.values.reverse then gear = -1 end
    local speed_kmh = (electrics.values.wheelspeed or 0) * 3.6
    local throttle_input = firstNumber(electrics.values.throttle_input, electrics.values.throttle) or 0
    local brake_input = firstNumber(electrics.values.brake_input, electrics.values.brake) or 0
    local clutch_input = firstNumber(electrics.values.clutch_input, electrics.values.clutch) or 0
    local steering_input = firstNumber(electrics.values.steering_input, input and input.steering) or 0
    local lat_g = (electrics.values.gx or 0) / 9.81

    -- 2. Tire Data (FL, FR, RL, RR)
    local tire_temps = {0, 0, 0, 0}
    local tire_surface = {0, 0, 0, 0}
    local tire_wear = {1.0, 1.0, 1.0, 1.0}
    local tire_pressures = {0, 0, 0, 0}
    
    local wheel_names = {"FL", "FR", "RL", "RR"}
    for i, name in ipairs(wheel_names) do
        local wd = getWheelData(name)
        if wd then
            -- BeamNG does not expose native tire thermals on every vehicle, so use
            -- available wheel/brake data to keep the dashboard live instead of frozen.
            tire_temps[i] = estimateTireTemperature(i, wd, dt, speed_kmh, brake_input, steering_input, lat_g)
            
            -- Surface Temp 
            tire_surface[i] = firstNumber(wd.treadTemperature, wd.surfaceTemperature, wd.tireSurfaceTemperature) or (tire_temps[i] + brake_input * 6)

            -- Pressure in BeamNG is usually stored on the wheel pressure group.
            tire_pressures[i] = getPressurePsi(wd)

            -- Wear / Integrity
            if wd.isBroken or wd.isTireDeflated then
                tire_wear[i] = 0.0
            end
        end
    end

    -- 3. Vehicle Health / Damage
    local damage = {
        engine = 1.0,
        transmission = 1.0,
        suspension = 1.0,
        brakes = 1.0,
        aero = 1.0
    }

    -- Engine & Powertrain
    if powertrain then
        local engines = powertrain.getDevicesByType("combustionEngine")
        if not engines or #engines == 0 then
            engines = powertrain.getDevicesByType("electricMotor")
        end
        local engine = firstPowertrainDevice(engines) or (powertrain.getDevice and powertrain.getDevice("mainEngine"))
        local engine_health = getDeviceHealth(engine)
        if engine_health then
            damage.engine = engine_health
        end
        
        local gearboxes = powertrain.getDevicesByCategory("gearbox")
        local gearbox = firstPowertrainDevice(gearboxes) or (powertrain.getDevice and (powertrain.getDevice("gearbox") or powertrain.getDevice("mainGearbox")))
        local gearbox_health = getDeviceHealth(gearbox)
        if gearbox_health then
            damage.transmission = gearbox_health
        end
    end

    -- Brakes (Thermal Fade/Damage)
    local brake_efficiency = 0
    local brake_count = 0
    for _, wd in pairs(wheels.wheels) do
        brake_efficiency = brake_efficiency + (wd.brakeThermalEfficiency or 1.0)
        brake_count = brake_count + 1
    end
    if brake_count > 0 then
        damage.brakes = brake_efficiency / brake_count
    end

    -- JBeam / Structural
    local structural = 0
    if beamstate then
        -- Estimate suspension health from overall vehicle damage and low-pressure beams
        structural = clamp((beamstate.damage or 0) / 10000, 0, 1) -- Scaled estimate
        damage.suspension = math.max(0, 1.0 - structural)
        
        -- If any wheel is broken, tank suspension health
        for _, wd in pairs(wheels.wheels) do
            if wd.isBroken then damage.suspension = math.min(damage.suspension, 0.4) end
        end
    end

    -- Aero (Based on broken parts)
    if electrics.values.airflowspeed and beamstate then
        -- If we have broken beams, estimate aero loss
        local aero_loss = (beamstate.damage or 0) / 20000
        damage.aero = math.max(0, 1.0 - aero_loss)
    end

    -- Some BeamNG builds do not expose component-specific powertrain damage;
    -- structural damage keeps engine/transmission indicators responsive.
    damage.engine = math.min(damage.engine, clamp(1.0 - structural * 0.45, 0, 1))
    damage.transmission = math.min(damage.transmission, clamp(1.0 - structural * 0.35, 0, 1))

    local data = {
        game = "BeamNG.drive",
        bridgeActive = true,
        timestamp = socket.gettime() * 1000,
        speed = speed_kmh,
        rpm = electrics.values.rpm or 0,
        gear = gear,
        throttle = clamp(throttle_input, 0, 1),
        brake = clamp(brake_input, 0, 1),
        clutch = clamp(clutch_input, 0, 1),
        steering = clamp(steering_input, -1, 1),
        
        -- G-Forces
        gForceX = (electrics.values.gx or 0) / 9.81,
        gForceY = (electrics.values.gy or 0) / 9.81,
        gForceZ = (electrics.values.gz or 0) / 9.81,

        -- Advanced Tires
        tireTemp = tire_temps,
        tireSurfaceTemp = tire_surface,
        tireWear = tire_wear,
        tirePressure = tire_pressures,

        -- Advanced Health
        carDamage = damage,
        
        -- Basic Electrics
        fuel = electrics.values.fuel or 0,
        engineTemp = electrics.values.watertemp or 80
    }

    local packet = jsonEncode(data)
    udp:sendto(packet, target_ip, target_port)
end

M.updateGFX = update
M.onUpdate = update -- Adding this just in case for backward compatibility

return M
