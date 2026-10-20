// notation: js file can only use this kind of comments
// since comments will cause error when use in webview.loadurl,
// comments will be remove by java use regexp

(function() {
  if (window.WebViewJavascriptBridge) {
    return;
  }

  var messagingIframe;
  var sendMessageQueue = [];
  var receiveMessageQueue = [];
  var messageHandlers = {};

  var CUSTOM_PROTOCOL_SCHEME = 'ytscheme';
  var QUEUE_HAS_MESSAGE = '__YTBASE_QUEUE_MESSAGE__/';

  // var uniqueId = 1
  var queueId = 1;
  var iframeId = 1;

  function isAndroid() {
    var ua = navigator.userAgent.toLowerCase();
    var isA = ua.indexOf('android') > -1;
    if (isA) {
      return true;
    }
    return false;
  }

  function isHarmony() {
    let ua = navigator.userAgent.toLowerCase();
    return ua.indexOf("openharmony") > -1;
  }

  function isIphone() {
    var ua = navigator.userAgent.toLowerCase();
    var isIph = ua.indexOf('iphone') > -1;
    if (isIph) {
      return true;
    }
    return false;
  }

  function isHarmony() {
    let ua = navigator.userAgent.toLowerCase();
    return ua.indexOf("openharmony") > -1;
  }

  /**
   * 判断是否是iPad设备
   * IOS13之前是以 ua 做判断，IOS13之后是以platform以及maxTouchPoints做判断
   * @returns Boolean
   */
  function isIpad() {
    // IOS13以前版本
    const ua = navigator.userAgent.toLowerCase();
    const isIpad1 = ua.indexOf('ipad') > -1;

    // IOS13及以后版本
    const isIpa2 =
      navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

    if (isIpad1 || isIpa2) {
      return true;
    }

    return false;
  }

  // set default messageHandler 初始化默认的消息线程
  function init(messageHandler) {
    if (WebViewJavascriptBridge._messageHandler) {
      throw new Error('WebViewJavascriptBridge.init called twice');
    }
    WebViewJavascriptBridge._messageHandler = messageHandler;
    var receivedMessages = receiveMessageQueue;
    receiveMessageQueue = null;
    for (var i = 0; i < receivedMessages.length; i++) {
      _dispatchMessageFromNative(receivedMessages[i]);
    }
  }

  // 发送
  function send(data) {
    _doSend({
      data: data
    });
  }

  // 注册线程 往数组里面添加值
  function registerHandler(handlerName, handler) {
    messageHandlers[handlerName] = handler;
  }
  // SM ADD 客户端同步实现
  function callHandlerSync(handlerName, data) {
    //
    let message = {
      handlerName: handlerName,
      data: data
    };
    //
    var list = [];
    list.push(message);
    var listStr = JSON.stringify(list);
    // 调用客户端同步API方法
    // ytscheme://return/[{"handlerName":"syncTestCall","data":{"a":"a1","b":"b2"}}]
    let sendData =
      CUSTOM_PROTOCOL_SCHEME + '://sync_return/' + encodeURIComponent(listStr);
    //
    // 返回值格式
    // {data: 写入的值, type: '数据类型'}
    //
    // if (!($Fw.platform === "web")) {
    //   return prompt(sendData, null) // prompt 安卓
    // } else {
    //   $Fw.Logger.error("请使用手持设备调试API!")
    // }
    return prompt(sendData, null);
  }
  // 调用线程
  function callHandler(handlerName, data) {
    if (typeof data === 'string') {
      // data = YT.JsonEval(data);
      console.log(typeof data);
      // data = $Fw.decode(data)
    }
    _doSend({
      handlerName: handlerName,
      data: data
    });
  }
  var iframeQueue = [];
  // sendMessage add message, 触发native处理 sendMessage
  function _doSend(message) {
    sendMessageQueue.push(message);
    var id = buildIframe();
    iframeQueue.push(id);
    // var iframe = $('#' + id);
    // SM ADD
    var iframe = document.querySelector('#' + id);
    var list = [];
    list.push(message);
    var listStr = JSON.stringify(list);
    var key = '_' + queueId++ + '_' + message.handlerName;

    // iframe.attr('src', CUSTOM_PROTOCOL_SCHEME + '://' + QUEUE_HAS_MESSAGE + key);
    // iframe.attr('data-message', encodeURIComponent(listStr));
    // iframe.attr('data-key', key);

    iframe.setAttribute(
      'src',
      CUSTOM_PROTOCOL_SCHEME + '://' + QUEUE_HAS_MESSAGE + key
    );
    iframe.setAttribute('data-message', encodeURIComponent(listStr));
    iframe.setAttribute('data-key', key);
  }

  function buildIframe() {
    var id = 'iframe_' + iframeId++ + '_Id';
    messagingIframe = document.createElement('iframe');
    messagingIframe.style.display = 'none';
    messagingIframe.style.opacity = '0';
    messagingIframe.style.border = '0';
    messagingIframe.style.heigth = '0';
    messagingIframe.id = id;
    document.documentElement.appendChild(messagingIframe);
    return id;
  }

  function removeIframe(id) {
    setTimeout(function() {
      // var iframe = $('#'+id);
      // SM ADD
      var iframe = document.querySelector('#' + id);
      // if(iframe.length > 0){
      iframe && iframe.remove();
      // }
    }, 2000);
  }

  // 提供给native调用,该函数作用:获取sendMessageQueue返回给native,由于android不能直接获取返回的内容,所以使用url
  // shouldOverrideUrlLoading 的方式返回内容
  function _fetchQueue() {
    var messageQueueString = JSON.stringify(sendMessageQueue);
    sendMessageQueue = [];
    var id = iframeQueue.shift();
    // add by hq
    if (isIphone() || isIpad()) {
      removeIframe(id);
      return messageQueueString;
      // android can't read directly the return data, so we can reload
      // iframe src to communicate with java
    } else if (isAndroid() || isHarmony()) {
      // old code
      // var iframe = $('#' + id);
      // var msg = iframe.attr('data-message');
      // iframe.attr('data-message', '');
      // var key = iframe.attr('data-key');
      // iframe.attr('src', CUSTOM_PROTOCOL_SCHEME + '://return/' + key + '/' + msg);

      // SM ADD
      var iframe = document.querySelector('#' + id);
      var msg = iframe.getAttribute('data-message');
      iframe.setAttribute('data-message', '');
      var key = iframe.getAttribute('data-key');
      iframe.setAttribute(
        'src',
        CUSTOM_PROTOCOL_SCHEME + '://return/' + key + '/' + msg
      );
      removeIframe(id);
      // messagingIframe.src = CUSTOM_PROTOCOL_SCHEME +
      // '://return/_fetchQueue/' +
      // encodeURIComponent(messageQueueString);
    }
  }

  // 提供给native使用,
  function _dispatchMessageFromNative() {}

  // 提供给native调用,receiveMessageQueue 在会在页面加载完后赋值为null,所以
  function _handleMessageFromNative(messageJSON) {
    if (receiveMessageQueue) {
      receiveMessageQueue.push(messageJSON);
    }
    _dispatchMessageFromNative(messageJSON);
  }

  var WebViewJavascriptBridge = (window.WebViewJavascriptBridge = {
    init: init,
    send: send,
    registerHandler: registerHandler,
    callHandler: callHandler,
    // SM ADD同步
    callHandlerSync: callHandlerSync,
    // SM ADD同步
    _fetchQueue: _fetchQueue,
    _handleMessageFromNative: _handleMessageFromNative
  });

  var doc = document;
  var readyEvent = doc.createEvent('Events');
  readyEvent.initEvent('WebViewJavascriptBridgeReady');
  readyEvent.bridge = WebViewJavascriptBridge;
  doc.dispatchEvent(readyEvent);
})();
