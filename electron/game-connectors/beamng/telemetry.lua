-- BeamNG.drive High-Fidelity Telemetry Bridge
-- This script exports deep vehicle data for the Telemetry Dashboard Application.
--
-- INSTALLATION:
-- 1. Copy this file to: %USERPROFILE%\AppData\Local\BeamNG.drive\<version>\scripts\vehicle\extensions\telemetry.lua
-- 2. In-game, open the console (~) and type: v.extensions.load('telemetry')
--    (Or add it to the vehicle's JBeam to load automatically)

local M = {}

local udp = socket.udp()
local target_ip = "127.0.0.1"
local target_port = 4440

local last_send_time = 0
local send_interval = 1/60 -- 60Hz

local function update(dt)
    local now = os.clock()
    if now - last_send_time < send_interval then return end
    last_send_time = now

    -- Basic Electrics
    local gear = electrics.values.gear or 0
    if gear == 0 and electrics.values.reverse then gear = -1 end

    -- Tire Data Extraction
    local tire_temps = {70, 70, 70, 70}
    local tire_wear = {1.0, 1.0, 1.0, 1.0}
    
    -- Map BeamNG wheels (0:FL, 1:FR, 2:RL, 3:RR - typically)
    for i = 0, 3 do
        local wd = wheels.wheels[i]
        if wd then
            -- Thermal data if available
            if wd.tireThermalColor then
                -- Estimate temp from thermal color/state or just use core if available
                tire_temps[i+1] = wd.tireThermalCoreTemperature or 70
            end
            -- Damage/Wear estimate from JBeam integrity
            if wd.isBroken then
                tire_wear[i+1] = 0.0
            end
        end
    end

    -- Damage Data
    local damage = {
        engine = 1.0 - (electrics.values.engineLoad or 0) * 0.1, -- Placeholder for complex calc
        transmission = 1.0,
        suspension = 1.0,
        brakes = 1.0,
        aero = 1.0
    }

    -- Better Damage Calculation
    if beamstate then
        damage.engine = 1.0 - (beamstate.damage or 0) / 5000
        damage.suspension = 1.0 - (beamstate.lowpressureAvg or 0) / 100
    end
    
    if powertrain and powertrain.getDevice("mainEngine") then
        local eng = powertrain.getDevice("mainEngine")
        damage.engine = 1.0 - (eng.damageLevel or 0)
    end

    local data = {
        game = "BeamNG.drive",
        timestamp = socket.gettime() * 1000,
        speed = (electrics.values.wheelspeed or 0) * 3.6, -- m/s to km/h
        rpm = electrics.values.rpm or 0,
        gear = gear,
        throttle = electrics.values.throttle or 0,
        brake = electrics.values.brake or 0,
        clutch = electrics.values.clutch or 0,
        steering = (electrics.values.steering or 0) / 450, -- Approximate normalization
        
        -- G-Forces (from sensor if available)
        gForceX = (electrics.values.gx or 0) / 9.81,
        gForceY = (electrics.values.gy or 0) / 9.81,
        gForceZ = (electrics.values.gz or 0) / 9.81,

        -- Tires
        tireTemp = tire_temps,
        tireWear = tire_wear,

        -- Health
        carDamage = damage,
        
        -- Extras
        fuel = electrics.values.fuel or 0,
        engineTemp = electrics.values.watertemp or 80
    }

    local packet = jsonEncode(data)
    udp:sendto(packet, target_ip, target_port)
end

M.update = update

return M
