var utils = require('./utils/util.js');
var {
  getShopInfo,
  updateUserInfo
} = require('./service/index.js');

// require('./utils/tracker.min.js')({token:"56e96beb4c61688af7b61348ea3e2f7e",behaviour:15});

App({
  //测试用
  // globalRequestUrl: "https://beta-api.m.jd.com?forcebot=" + encodeURIComponent('tds_609')+'&' ,
  //预发用
  globalRequestUrl: "https://beta-api.m.jd.com",
  // globalRequestUrl: "https://api.m.jd.care",
  //线上用
  //globalRequestUrl: "https://api.m.jd.com/api",

  globalRequestImgUrl: 'https:',
  globalRequestCdnImg: 'https://uweb.jd.com/cdn/img/jfjx/',
  globalData: {
    userId: '未取到唯一标识',
    globalLoginFlag: 0,
    unionGetUnplData: ''
  },
  onLaunch: function () {
      console.log('App onLaunch');
      // wx.clearStorageSync()
  },
  sendAPI(functionId, data) {
    const ptPin = '123467'; // 跟ptKey配合使用，已废弃
    const ptKey = '55345'; // 登录标识
    const unionId = wx.getStorageSync("unionId") || '';
    const time = new Date().getTime();
    data.unionId = unionId;
    let param = {
      functionId: functionId,
      _: time,
      appid: 'u',
      body: data,
      loginType: 2
    };
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalRequestUrl,
        data: param,
        header: {
          Cookie: 'pt_pin=' + encodeURIComponent(ptPin) + ';pt_key=' + ptKey
        },
        success: result => {
          if (result.data.code == 200) {
            resolve(result);
          } else {
            reject(result);
          }
        },
        fail: res => {
          console.log(res);
          reject(res);
        }
      });
    });
  },
  //发送给后端formId和code，后端用来发送模板消息
  sendFormId() {
    var formId = wx.getStorageSync('formId');
    console.log('存储的formId:' + formId)
    wx.login({
      success: (res) => {
        console.log(res)
        var code = res.code;
        var obj = {
          funName: "openidBindFormid",
          param: {
            jscode: code,
            formid: formId
          }
        }
        this.sendAPI('unionWechatBase', obj).then((res) => {
          console.log(res)
        }, () => {})
      }
    })
  },
  howToShare(source, data) { //分享
    let obj = {
      funName: 'getSharingSettingsList',
      param: {}
    };
    return this.sendAPI('unionUser', obj).then((res) => {
      res = res.data.data || [];
      if (res.length == 0) {
        this.goToMiniPro(data);
      } else {
        res.map((item) => {
          if (source == item.dataType) {
            this._chooseSetting(item.pattern, data);
          }
          return item;
        });
      }
    }, () => {
      wx.showToast({
        title: '查询设置方式失败，请重试',
        icon: 'none',
        duration: 2500
      });
    });
  },
  _chooseSetting(key, data) {
    if (key == 1) return this.goToMiniPro(data);
    if (key == 2) return this.goToCode(data);
  },
  goToMiniPro(data) { //小程序
    var obj = {
      funName: 'getCode',
      param: {
        skuId: data.skuId,
        // appid: 'wxf463e50cd384beda',
        appid: 'wx0de1a40953182cb1',
        couponUrl: data.couponUrl || '',
        planId: data.planId,
        requestId: data.requestId
      }
    }
    const unionId = wx.getStorageSync("unionId") || '';

    return this.sendAPI('unionSearch', obj).then((res) => {
      res = res.data.data;
      var clickUrl = encodeURIComponent(res.shortUrl);
      if (data.hasCoupon == 0) {
        wx.navigateToMiniProgram({
          appId: 'wx13e41a437b8a1d2e',
          path: 'pages/productUnion/productUnion?wareId=' + data.skuId + '&extendUrl=' + clickUrl + '&JingfenUnionid=' + unionId + '&JingfenType=1',
          extraData: {},
          //envVersion: 'trial',
          envVersion: 'trial',
          success(res) {
            // 打开成功
          },
          complete() {}
        })
      } else {
        wx.navigateToMiniProgram({
          appId: 'wx13e41a437b8a1d2e',
          path: 'pages/jingfen_twotoone_union/item?extendUrl=' + clickUrl + '&JingfenUnionid=' + unionId + '&JingfenType=2',
          extraData: {},
          envVersion: 'trial',
         //  envVersion: 'trial',
          success(res) {
            // 打开成功
          },
          complete() {}
        })
      }
    }, () => {
      wx.showToast({
        title: '生成推广链接失败，请重试',
        icon: 'none',
        duration: 2500
      });
    });
  },
  goToCode(data) { //二维码
    wx.navigateTo({
      url: '/pages/qrcode/qrcode?skuId=' + data.skuId,
    });
  },
  onError(msg) {
    console.error("全局捕获的错误信息：\n", msg)
  },

  GetUserInfo: function (e) {
    var app = this;
    app.checkEnter();
  },



  //成功进入店前检测
  checkEnter() {

    var app = this;
    const status = {
      "-2": "未登陆",
      "-1": "未知",
      "0": "未开通",
      "1": "退回重填",
      "2": "待审核",
      "3": "审核通过",
      "4": "关闭店铺",
      "5": "暂不推广"
    };
    
    return new Promise(function (resolve, reject) {
      app.getEnterStatus().then(([status, shopinfo]) => {
        if (status === 3) {
          return app.storeShopInfo(shopinfo).then(function (status) {
            console.log('检测登录状态：', status);
            if (status === 1) {
              resolve(3);
              console.log(3);
            } else if(status === -2) {//未授权
              reject([-2]);
              console.log('登录未授权');
            } 
          });
        } else {
          console.log('检测登录状态：', status);
          reject([status, shopinfo]);
        }
      });
    });

  },

  globalLoginShow() {
    wx.getSetting({
      success: res => {
        if (res.authSetting["scope.userInfo"]) {
          wx.removeStorageSync('jdlogin_pt_key');
          wx.removeStorageSync('jdlogin_pt_pin');
          var returnpage = '/pages/index/index';
          wx.navigateTo({
            url: '/pages/login/index/index?returnPage=' + returnpage + '&pageType=switchTab' + "&isLogout=1"
          });
        }
      }
    })
  },
  //获取成功进入店前状态
  getEnterStatus() {
    var app = this;
    return new Promise(function (resolve, reject) {
      
      getShopInfo({
          toast: false
        })
        .then(res => {
          if (res.code === 420) { //未登陆
            wx.reportMonitor('3', 1);
            resolve([-2]);
            return ;
          } else if (res.code === 603) { //登陆但未开通
            resolve([0]);
          } else if (res.code === 200) {
            resolve([res.data.status, res.data]);
          } else {
            wx.showToast({
              icon: 'none',
              title: res.code+res.message,
              duration: 2500
            });
          }
          if (res.code !== 420 && res.code !== 200) {
            wx.reportMonitor('4', 1);
          }
        })
        .catch(err => {
          console.error("page index ERROR: ", err);
        });
    });
  },

  //缓存shopinfo  
  storeShopInfo(shopinfo) {
    wx.setStorageSync('unionId', shopinfo.unionId);
    wx.setStorageSync('shopName', shopinfo.shopName);
    wx.setStorageSync('shopinfo', shopinfo);
    if (shopinfo.wxUserInfo) {
      shopinfo.wxUserInfo = JSON.parse(shopinfo.wxUserInfo);
      wx.setStorageSync('avatarUrl', shopinfo.wxUserInfo.avatarUrl);
    }
    var wxUserInfo_old = shopinfo.wxUserInfo;

    return new Promise(function (resolve, reject) {
      wx.getSetting({
        success: res => {
          if (res.authSetting["scope.userInfo"]) {
            wx.getUserInfo({
              success: res => {
                shopinfo.wxUserInfo = res.userInfo;
                wx.setStorageSync('avatarUrl', res.userInfo.avatarUrl);
                wx.setStorageSync('shopinfo', shopinfo);
                console.log('是否更新',!wxUserInfo_old || (wxUserInfo_old.avatarUrl !== res.userInfo.avatarUrl), wxUserInfo_old, res.userInfo.avatarUrl);
                if (!wxUserInfo_old || (wxUserInfo_old.avatarUrl !== res.userInfo.avatarUrl)) {
                  updateUserInfo(res.userInfo)
                }
                resolve(1);
              }
            });
          } else {
            resolve(-2);
          }
        }
      });
    });



  }
})