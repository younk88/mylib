var $ = require('common:widget/ui/base/base.js');

var subject = {
	observers: [],
	addObserver: function(observer, updateFunc) {
		this.observers.push({
			ob: observer,
			func: updateFunc
		});
		return this;
	},
	removeObserver: function(observer) {
		var observers = this.observers;
		for (var i = observers.length - 1; i >= 0; i--) {
			if(observers[i].ob == observer) {
				observers.splice(i, 1);
			}
		};
		return this;
	},
	notify: function() {
		var observers = this.observers,
			tmpOb;
		for (var i = 0; i < observers.length; i++) {
			tmpOb = observers[i];
			this._callObserver(tmpOb.ob, tmpOb.func);
		};
	},
	_callObserver: function(observer, updateFunc) {
		if(typeof(updateFunc) == 'string') {
			updateFunc = observer[updateFunc];
		}
		updateFunc.call(observer);
	}
};

//anything can be observer
/*var observer = {
	//
};*/

return subject;