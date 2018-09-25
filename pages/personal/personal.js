const app = getApp()

function inArray(arr, key, val) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i][key] === val) {
            return i;
        }
    }
    return -1;
}

// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
    var hexArr = Array.prototype.map.call(
        new Uint8Array(buffer),
        function (bit) {
            return ('00' + bit.toString(16)).slice(-2)
        }
    )
    return hexArr.join('');
}

Page({
    data: {
        devices: [],
        connected: false,
        chs: [],
        currDeviceId: ''
    },
    onLoad: function () {

    },

    openBluetoothAdapter:function() {
        wx.openBluetoothAdapter({
            success: (res) => {
                console.log('openBluetoothAdapter success', res)
                this.startBluetoothDevicesDiscovery()
            },
            fail: (res) => {
                if (res.errCode === 10001) {
                    wx.onBluetoothAdapterStateChange(function (res) {
                        console.log('onBluetoothAdapterStateChange', res)
                        if (res.available) {
                            this.startBluetoothDevicesDiscovery()
                        }
                    })
                }
            }
        })
    },
    getBluetoothAdapterState:function() {
        wx.getBluetoothAdapterState({
            success: (res) => {
                console.log('getBluetoothAdapterState', res)
                if (res.discovering) {
                    this.onBluetoothDeviceFound()
                } else if (res.available) {
                    this.startBluetoothDevicesDiscovery()
                }
            }
        })
    },

    startBluetoothDevicesDiscovery:function() {
        if (this._discoveryStarted) {
            return
        }
        this._discoveryStarted = true
        wx.startBluetoothDevicesDiscovery({
            allowDuplicatesKey: true,
            success: (res) => {
                console.log('startBluetoothDevicesDiscovery success', res)
                this.onBluetoothDeviceFound()
            },
        })
    },

    stopBluetoothDevicesDiscovery:function() {
        wx.stopBluetoothDevicesDiscovery()
    },

    onBluetoothDeviceFound:function() {
        wx.onBluetoothDeviceFound((res) => {
            res.devices.forEach(device => {
                if (!device.name && !device.localName) {
                    return
                }
                const foundDevices = this.data.devices
                const idx = inArray(foundDevices, 'deviceId', device.deviceId)
                const data = {}
                if (idx === -1) {
                    data[`devices[${foundDevices.length}]`] = device
                } else {
                    data[`devices[${idx}]`] = device
                }
                this.setData(data)
            })
        })
    },

    createBLEConnection:function(e) {
        console.log(e)
        const ds = e.currentTarget.dataset
        const deviceId = ds.deviceId
        const name = ds.name

        wx.createBLEConnection({
            deviceId,
            success: (res) => {
                this.setData({
                    connected: true,
                    name,
                    deviceId,
                })
                this.getBLEDeviceServices(deviceId,ds.value)
            }
        })
        this.stopBluetoothDevicesDiscovery()
    },

    closeBLEConnection:function() {
        wx.closeBLEConnection({
            deviceId: this.data.deviceId
        })
        this.setData({
            connected: false,
            chs: [],
            canWrite: false,
        })
    },

    getBLEDeviceServices:function(deviceId,value) {
        console.log(value)

        wx.getBLEDeviceServices({
            deviceId,
            success: (res) => {
                for (let i = 0; i < res.services.length; i++) {
                    if (res.services[i].isPrimary) {
                        this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid,value)
                        return
                    }
                }
            }
        })
    },

    getBLEDeviceCharacteristics:function(deviceId, serviceId,value) {
        wx.getBLEDeviceCharacteristics({
            deviceId,
            serviceId,
            success: (res) => {
                console.log('getBLEDeviceCharacteristics success', res.characteristics)
                for (let i = 0; i < res.characteristics.length; i++) {
                    let item = res.characteristics[i]
                    if (item.properties.read) {
                        wx.readBLECharacteristicValue({
                            deviceId,
                            serviceId,
                            characteristicId: item.uuid,
                        })
                    }
                    if (item.properties.write) {
                        this.setData({
                            canWrite: true
                        })
                        this._deviceId = deviceId
                        this._serviceId = serviceId
                        this._characteristicId = item.uuid
                        //默认命令
                        this.writeBLECharacteristicValue(value)
                    }
                    if (item.properties.notify || item.properties.indicate) {
                        wx.notifyBLECharacteristicValueChange({
                            deviceId,
                            serviceId,
                            characteristicId: item.uuid,
                            state: true,
                        })
                    }
                }
            },
            fail(res) {
                console.error('getBLEDeviceCharacteristics', res)
            }
        })
        // 操作之前先监听，保证第一时间获取数据
        wx.onBLECharacteristicValueChange((characteristic) => {
            const idx = inArray(this.data.chs, 'uuid', characteristic.characteristicId)
            const data = {}
            if (idx === -1) {
                data[`chs[${this.data.chs.length}]`] = {
                    uuid: characteristic.characteristicId,
                    value: ab2hex(characteristic.value)
                }
            } else {
                data[`chs[${idx}]`] = {
                    uuid: characteristic.characteristicId,
                    value: ab2hex(characteristic.value)
                }
            }
            this.setData(data)
        })
    },

    writeBLECharacteristicValue:function(value) {

        console.log()

        console.log({
            "deviceid:": this._deviceId,
            "serviceId": this._serviceId,
            "characteristicId": this._characteristicId
        })

        this.setData({
            currDeviceId: this._deviceId,
        })

        var sendData = value;
        let buffer = new ArrayBuffer(sendData.length);
        let dataView = new DataView(buffer);
        for (let i = 0; i < sendData.length; i++) {
            console.log(sendData.charAt(i).charCodeAt())
            dataView.setUint8(i, sendData.charAt(i).charCodeAt())
        }
        wx.writeBLECharacteristicValue({
            deviceId: this._deviceId,
            serviceId: this._serviceId,
            characteristicId: this._characteristicId,
            value: buffer,
            success: function (res) {
                console.log(res)
            }
        })
    },

    closeBluetoothAdapter:function() {
        wx.closeBluetoothAdapter()
        this._discoveryStarted = false
    },
})
