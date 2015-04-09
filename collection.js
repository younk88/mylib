var $ = require("common:widget/ui/base/base.js"),
	events = require('common:widget/ui/base/events.js'),
	LocalDB = require('./localdb.js');

/**
 * Collection基类，根据配置的cache和dataproxy，实现本地数据的缓存和读取
 * @author yangkun01
 * @date 2014/05/08
 * @param dataProxy {IDataProxy} load数据的代理
 * 							fetch: function(conditions, offset, limit, existDataSet) { }
 * @param cacheDb {LocalDb} 缓存实例
*/
function Collection(dataProxy, cacheDb) {
	var me = this,
		_cache = cacheDb;
	me.dataProxy = dataProxy;

	me.getCache = function(autoCreate) {
		if(!_cache && autoCreate) {
			_cache = new LocalDB();
		}
		return _cache;
	};

	me.configCache = function(options, clearData) {
		if(!_cache) {
			_cache = new LocalDB(options);
		} else {
			_cache.modify(options, !!clearData);
		}
	};
}

$.extend(Collection.prototype, events, {
	get: function(conditions, offset, limit) {
		offset = (offset || 0) * 1;
		limit = (limit || 0) * 1;
		var promise = new $.Deferred(),
			cache = this.getCache(),
			dataProxy = this.dataProxy,
			me = this,
			dataSet;
		//load from cache
		if(cache) {
			dataSet = cache.select(conditions, offset, limit);
		}
		if(dataSet && dataSet.length && (dataSet.length >= (limit || 0))) {
			//return cache result
			return promise.resolve(dataSet);
		}
		//fetch from proxy?
		if(!dataProxy) {
			//force return from cache
			return promise.resolve(dataSet);
		}

		//need fetch from proxy
		dataProxy.fetch(conditions, offset, limit, dataSet)
					.then(function(response) {
						if(response.dataSet && response.dataSet.length) {
							if(typeof(response.offset) == 'undefined' || (response.offset === false)) {
								me.put.apply(me, response.dataSet);
							} else {
								me.putAt(response.dataSet, response.offset);
							}
							dataSet = cache.select(conditions, offset, limit);
						}
						promise.resolve(dataSet);
					}, function() {
						promise.reject({msg: 'fetch data from dataProxy error'});
					});
		return promise;
	},
	putAt: function(dataSet, offset) {
		var cache = this.getCache(true);
		cache.insertAt(offset, dataSet);
	},
	put: function(data1, data2, datan) {
		var cache = this.getCache(true);
		cache.insert.apply(cache, arguments);
	}
});

//method for create simple collection 
Collection.create = function(options, extendMethods) {
	var primaryKey = options.pk, indexes = options.indexes;
	var db = new LocalDB({primaryKey: primaryKey, indexes: indexes}),
		inst = new Collection(options.dataProxy, db);
	extendMethods && $.extend(inst, extendMethods);
	return inst;
};

return Collection;