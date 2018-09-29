/**
 * Usage
 *
 * 1. Create
 *
 *      const url = 'wss://echo.websocket.org' --> test url
 *      const ws = new CtrlSocket(url)
 *
 * 2. Methods
 *
 *  2.1 subscribe
 *      ws.subscribe({
 *          onopen: function ,
 *          onmessage: function,
 *          onerror: function,
 *          onclose: function
 *      })
 *
 *      Or set a function , will call onmessage
 *      ws.subscribe((e)=>console.log(e.data))
 *
 *      return CtrlSocket Object
 *
 *  2.2 retry
 *      When ws state is closed and closed code != 1000 will do reconnect
 *
 *      ws.retry(count: Number,interval: Number)
 *
 *      retry(3, 1000) --> reconnect to server 3 times per second
 *
 *      retry(3) --> reconnect to server 3 times (interval default value is 5 seconds)
 *
 *      retry() --> reconnect to server until server response
 *
 *      return CtrlSocket Object
 *
 *  2.3 connect
 *
 *  2.4 disconnect
 *
 *  2.5 reconnect
 *
 *  2.6 send
 *
 *  2.7 readyState
 *      get ws state
 *
 *      const state = ws.readyState
 *
 *  2.8 heartBeat
 *      check ws still connect , if loss connection will call onclose
 *
 *      ws.heartBeat(interval: Number, message)
 *      interval--> default 30 seconds
 *
 *      ws.retry().heartBeat(3000,{
 *          comment: 'heartBeat'                 --> if loss connection , reconnect until server response
 *      })
 *
 *      ws.heartBeat()  --> if loss connection do nothing , readyState = CLOSED
 *
 *      return CtrlSocket Object
 */

/*
 *  connection status
 */
const CONNECTING = WebSocket.CONNECTING; // 0
const OPEN = WebSocket.OPEN; // 1
const CLOSING = WebSocket.CLOSING; // 2
const CLOSED = WebSocket.CLOSED; // 3

/*
 *  private functions
 */
const initWebsocketEvent = Symbol('initWebsocketEvent');
const clearTimer = Symbol('clearTimer');
const doRetry = Symbol('doRetry');
const doHeartCheck = Symbol('doHeartCheck');
const EMPTY_FUNCTION = () => {};

class CtrlSocket {
	constructor(url) {
		this.url = url;
		this.ws = null;
		this.wsState = CLOSED;
		this.timer = null;
		this.retryConfig = {
			count: 0,
			interval: 5000,
			tried: 0
		};
		this.heartBeatConfig = {
			doCheck: false,
			timeout: null,
			message: null,
			timeoutObj: null,
			serverTimeoutObj: null
		};
		this.listener = {
			onopen: EMPTY_FUNCTION,
			onmessage: EMPTY_FUNCTION,
			onerror: EMPTY_FUNCTION,
			onclose: EMPTY_FUNCTION
		};
	}

	[clearTimer]() {
		clearInterval(this.timer);
		this.timer = null;
	}

	[initWebsocketEvent]() {
		this.ws.onopen = e => {
			this.retryConfig.tried = 0;
			this.wsState = OPEN;
			this.listener.onopen(e);
			if (this.heartBeatConfig.doCheck) this[doHeartCheck]().start();
		};
		this.ws.onmessage = e => {
			this.listener.onmessage(e);
			if (this.heartBeatConfig.doCheck)
				this[doHeartCheck]()
					.reset()
					.start();
		};

		this.ws.onerror = this.listener.onerror;

		this.ws.onclose = e => {
			this.wsState = CLOSED;
			this[clearTimer]();
			this.ws = null;
			this.listener.onclose(e);
			if (this.heartBeatConfig.doCheck) this[doHeartCheck]().reset();
			if (this.retryConfig.count !== 0 && e.code !== 1000) this[doRetry]();
		};
	}

	[doRetry]() {
		let { count, interval, tried } = this.retryConfig;
		if (!count) {
			this.reconnect(interval);
			return;
		}
		if (this.wsState !== WebSocket.OPEN && tried < count - 1) {
			this.reconnect(interval);
			this.retryConfig.tried += 1;
		} else {
			this.retryConfig.tried = 0;
		}
	}

	[doHeartCheck]() {
		const self = this;
		const { timeout, message } = this.heartBeatConfig;
		return {
			reset: function() {
				clearTimeout(self.heartBeatConfig.timeoutObj);
				clearTimeout(self.heartBeatConfig.serverTimeoutObj);
				return this;
			},
			start: function() {
				self.heartBeatConfig.timeoutObj = setTimeout(() => {
					self.send(message);
					self.heartBeatConfig.serverTimeoutObj = setTimeout(() => {
						self.disconnect(4000, 'Loss connection');
					}, 10000);
				}, timeout);
			}
		};
	}

	subscribe(options) {
		if (typeof options === 'function') {
			this.listener.onmessage = options;
		} else {
			this.listener = Object.assign(this.listener, options);
		}
		return this;
	}

	connect() {
		if (this.wsState !== CLOSED) {
			throw new Error('Connection is busy, please try again later.');
		}
		this.wsState = CONNECTING;
		this.ws = new WebSocket(this.url);
		this[initWebsocketEvent]();
		return this;
	}

	disconnect(code = 1000, reason = 'Normal closure') {
		if ((code && !code === 1000) || (code >= 4999 && code <= 3000)) {
			throw new Error('Invalid code');
		}
		if (this.ws !== null && this.wsState === OPEN) {
			this.wsState = CLOSING;
			const wasClean = true;
			this.retryConfig.tried = 0;
			this.ws.close(code, reason, wasClean);
		} else {
			throw new Error('Connection has already been closed');
		}
	}

	reconnect(interval = 5000) {
		if (typeof this.timer !== 'undefined' || this.timer !== null) {
			this[clearTimer]();
		}
		this.timer = setInterval(() => {
			if (this.wsState === CLOSED) {
				this.connect();
			}
		}, interval);
	}

	retry(count, interval = 5000) {
		if (count < 0) {
			throw new Error('Retry count must not be less than 0');
		}
		this.retryConfig = Object.assign(this.retryConfig, { count, interval });
		return this;
	}

	heartBeat(timeout = 30000, message = { command: 'ping' }) {
		this.heartBeatConfig = {
			doCheck: true,
			timeout,
			message
		};
		return this;
	}

	send(data) {
		if (this.readyState === CONNECTING) {
			throw new Error('The connection has not been established yet');
		}
		if (this.readyState !== OPEN) {
			return;
		}
		if (typeof data === 'object') {
			data = JSON.stringify(data);
		}
		this.ws.send(data);
	}

	get readyState() {
		return this.wsState;
	}
}
export default CtrlSocket;
