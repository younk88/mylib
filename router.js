var $ = require('common:widget/ui/base/base.js');

/**
 * 路由控制器，设置路由规则，分发到对应的action
 * @author: yangkun01
 * @date: 2014/06/11
*/
function RouterController(pageModel) {
	this.rules = [];
	this.model = pageModel;
	this._actions = {};
	this.currentAction = null;
	this._ruleKeys = {};
	var me = this;
	this._modelUpdateHandler = function(args) {
		if(args && args.keys && args.keys.length) {
			var keys = args.keys,
				needDispatch = false;
			for (var i = keys.length - 1; i >= 0; i--) {
				if(me._ruleKeys[keys[i]]) {
					needDispatch = true;
					break;
				}
			};
			needDispatch && me.dispatch();
		}
	};
	pageModel.addEventListener('changed', this._modelUpdateHandler);
}
$.extend(RouterController.prototype, {
	/**
	 * 添加一条路由规则
	 * @param rule {Object} 路由条件
	 * @param action {String} 处理该路由的action路径
	 * @example addRule({tn: 'baiduimagedetail', cg: 'wallpaper'}, 'searchdetailnew:widget/ui/app/action/base.js');
	*/
	addRule: function(rule, action) {
		this.rules.push({
			rule: rule,
			action: action
		});
		this._recordRuleKeys([rule]);
	},
	/**
	 * 添加多条路由规则
	 * @param rules {Array} 路由条件,item格式：
	 * 				rule {Object} 路由条件
	 * 				action {String} 处理该路由的action路径
	 * @example addRules([{
	 * 				rule: {tn: 'baiduimagedetail', cg: 'wallpaper'}, 
	 * 				action: 'searchdetailnew:widget/ui/app/action/base.js'
	 * 			}]);
	*/
	addRules: function(rules) {
		if(rules && rules.length) {
			this.rules = this.rules.concat(rules);
			this._recordRuleKeys(rules);
		}
	},
	/**
	 * 记录路由规则中的key，model发生变化时，作为是否分发的依据
	 * @param rules {Array} 路由条件集合
	*/
	_recordRuleKeys: function(rules) {
		if(!rules) {
			return;
		}
		var rule;
		for (var i = rules.length - 1; i >= 0; i--) {
			rule = rules[i];
			for(var key in rule) {
				if(rule.hasOwnProperty(key)) {
					this._ruleKeys[key] = true;
				}
			}
		};
	},
	/**
	 * 加载action
	 * @param action {String} 处理该路由的action路径
	*/
	loadAction: function(action) {
		var pro = new $.Deferred(),
			me = this,
			actionInst = this._actions[action];
		if(!actionInst) {
			require.async(action, function(actionDef) {
				actionInst = (typeof(actionDef) == 'function' ? new actionDef(me.model) : actionDef);
				me._actions[action] = actionInst;
				pro.resolve(actionInst);
			});
		} else {
			pro.resolve(actionInst);
		}
		return pro;
	},
	/**
	 * 检查规则是否命中
	 * @remark: 空对象表示无条件命中
	 * @param rule {Object} 参见addRule
	 * @return {Boolean}
	*/
	checkRule: function(rule) {
		if(rule) {
			var hit = true, 
				model = this.model;
			for(var key in rule) {
				if(rule.hasOwnProperty(key)) {
					hit = (model.get(key) == rule[key]);
					if(!hit) {
						break;
					}
				}
			}
			return hit;
		}
		return false;
	},
	/**
	 * 开始分发，执行该方法前请确保规则已添加完成
	*/
	dispatch: function() {
		var rules = this.rules,
			pageModel = this.model,
			ruleInfo;
		for (var i = 0; i < rules.length; i++) {
			ruleInfo = rules[i];
			if(this.checkRule(ruleInfo.rule)) {
				this.loadAction(ruleInfo.action).then(function(actionInst) {
					if(actionInst && (actionInst != this.currentAction)) {
						this.currentAction = actionInst;
						actionInst.process(pageModel, ruleInfo.rule);
					}
				});
				break;
			}
		};
	}
});

return RouterController;