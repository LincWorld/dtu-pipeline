const { Sequelize, DataTypes } = require('sequelize');
const mqtt = require('mqtt');
const BigJSON = require("json-bigint")({
    useNativeBigInt: true
});
const sequelize = new Sequelize(process.env.MYSQL_DATABASE, process.env.MYSQL_USER, process.env.MYSQL_PASSWORD, {
    host: process.env.MYSQL_HOST,
    dialect: 'mysql'
});

const ElectricData = sequelize.define('ElectricData', {
    // Model attributes are defined here
    device: {
        type: DataTypes.STRING,
        allowNull: false
    },
    channel: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    current_rms: {
        type: DataTypes.BIGINT
    },
    current_peak: {
        type: DataTypes.BIGINT
    },
    current_crestFactor: {
        type: DataTypes.FLOAT
    },
    power_active: {
        type: DataTypes.BIGINT
    },
    powerFactor_true: {
        type: DataTypes.FLOAT
    },
    energy_active: {
        type: DataTypes.BIGINT
    },
}, {
    indexes: [
        {
            unique: true,
            fields: ['timestamp', 'device', 'channel']
        }
    ]
});

const TemperatureData = sequelize.define('TemperatureData', {
    // Model attributes are defined here
    device: {
        type: DataTypes.STRING,
        allowNull: false
    },
    channel: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    temperature: {
        type: DataTypes.FLOAT
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['timestamp', 'device', 'channel']
        }
    ]
});

const VoltageData = sequelize.define('VoltageData', {
    // Model attributes are defined here
    device: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phase: {
        type: DataTypes.STRING,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    voltage_rms: {
        type: DataTypes.INTEGER
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['timestamp', 'device', 'phase']
        }
    ]
});

(async () => {
    await sequelize.sync();
    const mqttClient = mqtt.connect(`mqtts://broker.linc.world:8883`, {
        username: process.env.LINC_ACCESS_TOKEN
    });
    console.log(process.env.LINC_DEVICES.split(",").map((e) => `devices/${e}/#`))
    mqttClient.subscribe(process.env.LINC_DEVICES.split(",").map((e) => `devices/${e}/#`), (err, granted) => {
        if (err) {
            throw err;
        }
    });
    mqttClient.on("connect", () => {
        console.log("Connected");
    });
    mqttClient.on("message", handlePayload);
})();

const handlePayload = (topic, payload) => {
    const parsedData = BigJSON.parse(payload.toString());
    switch (parsedData.entityType) {
        case "channel": {
            if (parsedData.data.temperature) {
                TemperatureData.upsert({
                    device: parsedData.device.id,
                    channel: parsedData.id,
                    timestamp: new Date(parsedData.data.timestamp * 1000),
                    temperature: parsedData.data.temperature
                });
            } else if (parsedData.data.current) {
                const row = {
                    device: parsedData.device.id,
                    channel: parsedData.id,
                    timestamp: new Date(parsedData.data.timestamp * 1000),
                    current_rms: parsedData.data.current.rms,
                    current_peak: parsedData.data.current.peak,
                    current_crestFactor: parsedData.data.current.crestFactor
                };
                if (parsedData.data.energy && parsedData.data.energy.active) {
                    row.energy_active = parsedData.data.energy.active
                }
                if (parsedData.data.power && parsedData.data.power.active) {
                    row.power_active = parsedData.data.power.active
                }
                if (parsedData.data.powerFactor && parsedData.data.powerFactor.truePowerFactor) {
                    row.powerFactor_true = parsedData.data.powerFactor.truePowerFactor
                }
                ElectricData.upsert(row);
            }
            break;
        }
        case "voltage": {
            VoltageData.upsert({
                device: parsedData.device.id,
                phase: parsedData.id,
                timestamp: new Date(parsedData.data.timestamp * 1000),
                voltage_rms: parsedData.data.voltage.rms
            });
            break;
        }
    }
};