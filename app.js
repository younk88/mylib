var $ = require('common:widget/ui/base/base.js'),
	RouterController = require('./router.js');

/**
 * 页面主程序，js入口
 * @author: yangkun01
 * @date: 2014/06/11
*/
function App(pageModel) {
	this.pageModel = pageModel;
	this.router = new RouterController(pageModel);
	this.isReady = false;
	this._readyFunc = [];
}
$.extend(App.prototype, {
	/**
	 * 初始化app，设置路由规则等
	*/
	init: function() {
		this.isReady = true;
		var func;
		while(func = this._readyFunc.shift()) {
			func && func();
		}
	},
	/**
	 * 设置路由信息
	 * @param routerInfo {Object} 路由信息
	*/
	setRoute: function(routeInfo) {
		this.pageModel.set(routeInfo);
	},
	/**
	 * 运行入口方法，路由分发
	*/
	run: function() {
		this.router.dispatch();
	},
	ready: function(func) {
		if(this.isReady) {
			func && func();
		} else {
			this._readyFunc.push(func);
		}
	}
});

return App;