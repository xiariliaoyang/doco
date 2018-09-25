//logs.js
//const util = require('../../utils/util.js')
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
    devicesList: [],
    bluetoothStatus: false,
    connectNow: false,
    blueData: []
  },
  onLoad: function () {
    var that = this
    if (this.bluetoothStatus) {
      console.log("open")
    } else {
      console.log("close")
      wx.openBluetoothAdapter({
        success: function (res) {
          that.setData({
            bluetoothStatus: true
          })
        }
      })
    }
    /*var text = "at+md=10";
    var str = [];
    for (let i = 0; i < text.length; i++) {
      str.push(text.charCodeAt(i))
    }
    console.log(str)
    let buffer = new ArrayBuffer(text.length)
    let dataView = new DataView(buffer)

    for (let i = 0; i < str.length; i++) {      
      dataView.setUint8(i, str[i])
    }*/

    var sendData = "at+md=10";
    let buffer = new ArrayBuffer(sendData.length);
    let dataView = new DataView(buffer);
    for (let i = 0; i < sendData.length; i++) {
      console.log(sendData.charAt(i).charCodeAt())
      dataView.setUint8(i, sendData.charAt(i).charCodeAt())
    }

    var b = ab2hex(buffer);
    console.log(b)

  },

  searchBluetooth: function () {
    var that = this
    wx.startBluetoothDevicesDiscovery({
      success: function (res) {
        wx.getBluetoothDevices({
          success: function (data) {
            var devices = data.devices;
            var devicesArray = [];
            for (let i = 0; i < devices.length; i++) {
              if (devices[i].name.indexOf("DOCO") >= 0) {
                devicesArray.push(devices[i])
              }
            }
            that.setData({
              devicesList: devicesArray,
              connectNow: true
            })
          }
        })
      }
    })
  },


  connectDevice: function (e) {
    var that = this;
    var deviceId = e.currentTarget.dataset.deviceid;
    wx.createBLEConnection({
      deviceId: deviceId,
      success: function (res) {
        //获取服务项目
        console.log("获取的deviceid" + deviceId)
        wx.getBLEDeviceServices({
          deviceId: deviceId,
          success: function (res) {
            wx.showToast("链接成功！");
            for (let i = 0; i < res.services.length; i++) {
              that.getService(deviceId, res.services[i].uuid)
            }
          }
        })
      }
    })

  },

  getService: function (deviceId, serviceId) {
    var that = this;
    wx.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: serviceId,
      success: function (res) {
        console.log(res)
        for (let i = 0; i < res.characteristics.length; i++) {
          if (res.characteristics[i].properties.write) {
            console.log(res.deviceId, res.serviceId, res.characteristics[i].uuid)
            var a = {
              deviceId: res.deviceId,
              serviceId: res.serviceId,
              characteristicId: res.characteristics[i].uuid
            }
            that.data.blueData.push(a)

            setTimeout(function () {
              that.onOpenNotify(res.deviceId, res.serviceId, res.characteristics[i].uuid)
            }, 3000)
          }

          that.post("at+md=10")

        }
      }
    })
  },

  onOpenNotify: function (deviceId, serviceId, characteristicId) {

    wx.notifyBLECharacteristicValueChange({
      state: true,
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      success: function (res) {
        console.log(res)
      }
    })
  },

  postData: function (e) {
    console.log(e.target.dataset.value)
    var that = this;
    var sendData = value;
    let buffer = new ArrayBuffer(sendData.length);
    let dataView = new DataView(buffer);
    for (let i = 0; i < sendData.length; i++) {
      console.log(sendData.charAt(i).charCodeAt())
      dataView.setUint8(i, sendData.charAt(i).charCodeAt())
    }
    wx.writeBLECharacteristicValue({
      deviceId: that.data.blueData[1].deviceId,
      serviceId: that.data.blueData[1].serviceId,
      characteristicId: that.data.blueData[1].characteristicId,
      value: buffer,
      success: function (res) {
        console.log(res)
      }
    })



  },




  /* postData:function(deviceId,serviceId,characteristicId){

    var a = 'at+md=55';
    let buffer = new ArrayBuffer(a)
    let dataView = new DataView(buffer)

    wx.writeBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId:characteristicId,
      value:buffer,
      success:function(res){
        console.log(res)
      }
    })
  } */




})
