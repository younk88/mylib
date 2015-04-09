var $ = require("common:widget/ui/base/base.js");

//condition class
var operators = {
		'=': 'equal',
		'===': 'allEqual',
		'!=': 'notEqual',
		'!==': 'notAllEqual',
		'>': 'greaterThan',
		'>=': 'greaterEqual',
		'<': 'lessThan',
		'<=': 'lessEqual',
		'in': 'inRange'
	};

function Condition() {
	this.leftKey = '';
	this.opMethod = 'equal';
	this.right = '';
	this.rightIsKey = false;
}
$.extend(Condition.prototype, {
	check: function(dataObj) {
		if(!this.opMethod && !dataObj) {
			return false;
		}
		var leftVal = dataObj[this.leftKey],
			rightVal = (this.rightIsKey ? dataObj[this.right] : this.right);
		return Condition.prototype[this.opMethod].call(this, leftVal, rightVal);
	},
	equal: function(leftVal, rightVal) {
		return leftVal == rightVal;
	},
	allEqual: function(leftVal, rightVal) {
		return leftVal === rightVal;
	},
	notEqual: function(leftVal, rightVal) {
		return leftVal != rightVal;
	},
	notAllEqual: function(leftVal, rightVal) {
		return leftVal !== rightVal;
	},
	greaterThan: function(leftVal, rightVal) {
		return leftVal > rightVal;
	},
	greaterEqual: function(leftVal, rightVal) {
		return leftVal >= rightVal;
	},
	lessThan: function(leftVal, rightVal) {
		return leftVal < rightVal;
	},
	lessEqual: function(leftVal, rightVal) {
		return leftVal <= rightVal;
	},
	inRange: function(leftVal, rightVal) {
		return $.isArray(rightVal) && ($.inArray(leftVal, rightVal));
	}
});

function ConditionCollection(list) {
	this.list = list;
}
$.extend(ConditionCollection.prototype, {
	check: function(dataObj) {
		var list = this.list;
		for (var i = list.length - 1; i >= 0; i--) {
			if(!list[i].check(dataObj)) {
				return false;
			}
		};
		return true;
	}
});

function paseSingleCondition(leftStr, right) {
	var cond = new Condition(),
		lastWhiteSpaceIdx = leftStr.lastIndexOf(' '),
		opStr = '';
	if(lastWhiteSpaceIdx > 0) {
		cond.leftKey = leftStr.substr(0, lastWhiteSpaceIdx);
		opStr = $.trim(leftStr.substr(lastWhiteSpaceIdx + 1));
	} else {
		cond.leftKey = leftStr;
	}
	cond.opMethod = operators[opStr || '='];
	if(typeof(right) == 'string' && (right.length > 2) 
		&& (right.substr(0, 1) == '`') && (right.substr(right.length - 1) == '`')) {
		cond.right = right.substr(1, right.length - 2);
		cond.rightIsKey = true;
	} else {
		cond.right = right;
		cond.rightIsKey =  false;
	}
	return cond;
}
/**
 * {'x =': 1, 'y >': 2, 'z ===': '`zz`'}
*/
Condition.parse = function(conditions) {
	var list = [];
	for(var leftStr in conditions) {
		if(conditions.hasOwnProperty(leftStr)) {
			list.push(paseSingleCondition(leftStr, conditions[leftStr]));
		}
	}
	return (list.length > 1 ? new ConditionCollection(list) : list[0]);
};

/**
 * 本地cache，支持数据的增删改查
 * @author yangkun01
 * @date 2014/05/08
 * @param options {Object} 选项
 * 				primaryKey: {String} （必须）主键，eg: id
 *				indexes: {Array} 索引定义，组合索引用数组表示，eg: [['col', 'tag', 'sort'],...
*/
function LocalDB(options) {
	options = options || {};
	var me = this,
		_primaryKey = options.primaryKey || 'id',
		_indexes = [],
		_rowsData = [],  //行数据，只记录了primaryKey值
		_pkIndexData = {}, //主键数据，实际数据在该对象下
		_indexData = {}; //索引数据, eg: {'col,tag,sort' => {'美女': {'全部': {0: [id1, idx, ...]}}}, 'pid' => {'xxx': [idx, idy]}}

	_setIndexes(options.indexes);

	//设置索引
	function _setIndexes(indexes) {
		if(indexes) {
			var indexDef;
			for (var i = indexes.length - 1; i >= 0; i--) {
				indexDef = indexes[i];
				_indexes.unshift($.isArray(indexDef) ? indexDef : [String(indexDef)]);
			};
			_rowsData.length && _rebuildIndexData();
		}
	}
	//重新组建索引数据
	function _rebuildIndexData() {
		_indexData = {};
		var pkValue;
		for (var i = 0, l = _rowsData.length; i < l; i++) {
			pkValue = _rowsData[i];
			_updateIndexData(_pkIndexData[pkValue], pkValue);
		}
	}
	//添加数据行
	function _insertRow(row, index) {
		var pkValue = row && row[_primaryKey];
		if(typeof(pkValue) == "undefined" || _pkIndexData[pkValue]) {
			return false;
		}
		row.__idx_ = index;
		_pkIndexData[pkValue] = row;
		_rowsData[index] = pkValue;
		_updateIndexData(row, pkValue);
		return true;
	}

	//为数据行创建索引
	function _updateIndexData(row, pkValue) {
		var idx = row.__idx_, indexDef,tmpIndexData,tmpIndexKey,tmpIndexDataSet,tmpPos;
		for (var i = _indexes.length - 1; i >= 0; i--) {
			indexDef = _indexes[i];
			tmpIndexKey = indexDef.join(",");
			tmpIndexData = _indexData[tmpIndexKey];
			if(!tmpIndexData) {
				tmpIndexData = _indexData[tmpIndexKey] = {};
			}
			tmpIndexDataSet = _findIndexDataSet(tmpIndexData, indexDef, row, true);
			//insert into indexdataset
			if(!tmpIndexDataSet.length || _pkIndexData[tmpIndexDataSet[tmpIndexDataSet.length - 1]].__idx_ < idx) {
				tmpIndexDataSet.push(pkValue);
			} else if(_pkIndexData[tmpIndexDataSet[0]].__idx_ < idx) {
				tmpIndexDataSet.unshift(pkValue);
			} else {
				tmpPos = _findInsertPos(tmpIndexDataSet, idx);
				if(tmpPos.replace) {
					tmpIndexDataSet[tmpPos.index] = pkValue;
				} else {
					tmpIndexDataSet.splice(tmpPos.index, 0, pkValue);
				}
			}
		};
	}
	function _findInsertPos(dataSet, index) {
		var tmpIndex;
		for (var i = dataSet.length - 1; i >= 0; i--) {
			tmpIndex = _pkIndexData[dataSet[i]].__idx_;
			if(tmpIndex == index) {
				return {index: i, replace: true};
			} else if(tmpIndex < index) {
				return {index: i + 1, replace: false};
			}
		};
		return {index: 0, replace: false};
	}
	/**
	 * 查找行数据在索引中插入的位置
	 * @param indexData {Object} 索引数据对象
	 * @param indexDef {Array} 索引定义
	 * @param conditions {Object} 查询条件
	 * @param autoAdd {Boolean} 没命中时是否自动添加
	*/
	function _findIndexDataSet(indexData, indexDef, conditions, autoAdd) {
		var idxCol,colVal,dataSet;
		for (var i =0, l = indexDef.length; i < l; i++) {
			idxCol = indexDef[i];
			colVal = conditions[idxCol];
			dataSet = indexData[colVal];
			if(!dataSet) {
				if(autoAdd) {
					dataSet = indexData[colVal] = (i == (l - 1) ? [] : {});
				} else {
					return null;
				}
			}
			indexData = dataSet;
		}
		return dataSet;
	}
	function _getKeyListFromIndexDataSet(dataSet) {
		if($.isArray(dataSet)) {
			return dataSet;
		} else {
			var list = [];
			for(var p in dataSet) {
				if(dataSet.hasOwnProperty(p)) {
					list = list.concat(_getKeyListFromIndexDataSet(dataSet[p]));
				}
			}
			return list;
		}
	}

	//根据主键获取数据
	function _findDataByKeys(keyList) {
		var result = [], tmpObj;
		for (var i = keyList.length - 1; i >= 0; i--) {
			tmpObj = _pkIndexData[keyList[i]];
			(typeof(tmpObj) != 'undefined') && result.unshift(tmpObj);
		};
		return result;
	}
	//按条件过滤数据
	function _filterByConds(keyList, conditions, offset, limit) {
		var cond = Condition.parse(conditions),
			index = 0,
			len = keyList.length,
			result = [],
			targetIndex = -1,
			tmpObj;
		limit = limit || len;
		offset = offset || 0;
		while(index < len && result.length < limit) {
			tmpObj = _pkIndexData[keyList[index]];
			if(cond.check(tmpObj)) {
				targetIndex += 1;
				if(targetIndex >= offset) {
					result.push(tmpObj);
				}
			}
			index += 1;
		}
		return result;
	}

	function _getUsedIndex(conditions) {
		if(conditions[_primaryKey]) {
			//主键
			return [_primaryKey];
		}
		var indexDef,tmpUsed;
		for (var i = 0, l = _indexes.length; i < l; i++) {
			indexDef = _indexes[i];
			tmpUsed = true;
			for (var j = 0, idxLen = indexDef.length; j < idxLen; j++) {
				if(typeof(conditions[indexDef[j]]) == "undefined") {
					tmpUsed = false;
					break;
				}
			}
			if(tmpUsed) {
				return indexDef;
			}
		}
		return false;
	}
	function _findRows(conditions, offset, limit) {
		conditions = $.extend({}, conditions);
		//
		var usedIndex = _getUsedIndex(conditions),
			keyList;
		if(usedIndex) {
			if(usedIndex[0] == _primaryKey) {
				//主键
				var pkCondValue = conditions[_primaryKey];
				keyList = [pkCondValue];
			} else {
				//from index
				var indexData = _indexData[usedIndex.join(",")];
				dataSet = _findIndexDataSet(indexData, usedIndex, conditions, false);
				keyList = _getKeyListFromIndexDataSet(dataSet); 
			}
			$(usedIndex).each(function(i, indexColName) {
				delete conditions[indexColName];
			});
		} else {
			//all
			keyList = _rowsData;
		}
		//filter by conditions
		var result;
		if(!$.isEmptyObject(conditions)) {
			//filter by conditions
			result = _filterByConds(keyList, conditions, offset, limit);
		} else {
			var resultKeys = (offset || limit ? keyList.slice(offset, offset + limit) : keyList);
			result = _findDataByKeys(resultKeys);
		}
		return {result: result, usedIndex: usedIndex};
	}

	//更改库设置，建议未添加数据前操作
	me.modify = function(options, clearData) {
		if(!!clearData) {
			_rowsData = [];
			_pkIndexData = {};
			_indexData = {};
		}
		_primaryKey = options.primaryKey || _primaryKey;
		_setIndexes(options.indexes);
	};

	me.select = function(conditions, offset, limit) {
		var ret = _findRows(conditions, offset, limit);
		return ret.result;
	};
	me.insert = function(row1, row2, rown) {
		me.insertAt(_rowsData.length, arguments);
	};
	me.insertAt = function(index, rows) {
		var count = 0;
		for (var i = 0, l = rows.length; i < l; i++) {
			if(_insertRow(rows[i], index + i)) {
				count++;
			}
		}
		return count;
	};
	me.update = function(fields, conditions) {
		//暂不实现
	};
	me.remove = function(conditions, offset, limit) {
		//暂不实现
	};
}

return LocalDB;