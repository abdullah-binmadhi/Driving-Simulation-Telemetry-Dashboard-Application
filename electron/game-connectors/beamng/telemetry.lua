-- BeamNG.drive High-Fidelity Telemetry Bridge (v2.0)
-- Optimized for Tire PVT and JBeam Damage Monitor

local M = {}

local udp = socket.udp()
local target_ip = "127.0.0.1"
local target_port = 4440

local last_send_time = 0
local send_interval = 1/60 -- 60Hz

-- Helper to find wheel by name
local function getWheelData(name)
    for _, wd in pairs(wheels.wheels) do
        if wd.name == name then return wd end
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

    -- 2. Tire Data (FL, FR, RL, RR)
    local tire_temps = {0, 0, 0, 0}
    local tire_surface = {0, 0, 0, 0}
    local tire_wear = {1.0, 1.0, 1.0, 1.0}
    local tire_pressures = {0, 0, 0, 0}
    
    local wheel_names = {"FL", "FR", "RL", "RR"}
    for i, name in ipairs(wheel_names) do
        local wd = getWheelData(name)
        if wd then
            -- Temperature (Tread/Core)
            tire_temps[i] = wd.tireThermalCoreTemperature or 70
            
            -- Surface Temp (using treadTemp as proxy for surface)
            if wd.tire then
                tire_surface[i] = wd.tire.treadTemp or 70
                -- Pressure (convert bar to PSI: 1 bar = 14.5038 PSI)
                tire_pressures[i] = (wd.tire.pressure or 0) * 14.5038
            end

            -- Wear / Integrity
            if wd.isBroken then
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
        local engine = powertrain.getDevice("mainEngine")
        if engine then
            damage.engine = 1.0 - (engine.damageLevel or 0)
        end
        
        local trans = powertrain.getDevice("gearbox")
        if trans then
            damage.transmission = 1.0 - (trans.damageLevel or 0)
        end
    end

    -- JBeam / Structural
    if beamstate then
        -- Estimate suspension health from overall vehicle damage and low-pressure beams
        local structural = (beamstate.damage or 0) / 10000 -- Scaled estimate
        damage.suspension = math.max(0, 1.0 - structural)
        
        -- If any wheel is broken, tank suspension health
        for _, wd in pairs(wheels.wheels) do
            if wd.isBroken then damage.suspension = math.min(damage.suspension, 0.4) end
        end
    end

    -- Aero (Based on broken parts)
    if electrics.values.airflowspeed then
        -- If we have broken beams, estimate aero loss
        local aero_loss = (beamstate.damage or 0) / 20000
        damage.aero = math.max(0, 1.0 - aero_loss)
    end

    local data = {
        game = "BeamNG.drive",
        timestamp = socket.gettime() * 1000,
        speed = (electrics.values.wheelspeed or 0) * 3.6,
        rpm = electrics.values.rpm or 0,
        gear = gear,
        throttle = electrics.values.throttle or 0,
        brake = electrics.values.brake or 0,
        clutch = electrics.values.clutch or 0,
        steering = electrics.values.steering or 0,
        
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
