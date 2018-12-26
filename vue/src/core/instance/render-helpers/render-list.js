/* @flow */

import { isObject, isDef } from 'core/util/index'

/**
 * Runtime helper for rendering v-for lists.
 */

 // 渲染List
 // 配合V-for使用
// <div v-for='key in items'><h2>{{key}}</h2><abc></abc><div>{{info}}</div><div v-if='show'>show</div></div>
// with(this){return _l((items),function(key){return _c('div',[_c('h2',[_v(_s(key))]),_c('abc'),_c('div',[_v(_s(info))]),(show)?_c('div',[_v("show")]):_e()],1)})}
// v-for支持4种数据类型
// array => 回调就是(value,index)
// string => 回调就是(char,index)
// number => 回调就是(1~n,index)
// object => 回调就是(val,key,index)

export function renderList (
  val: any,
  render: (
    val: any,
    keyOrIndex: string | number,
    index?: number
  ) => VNode
): ?Array<VNode> {
  let ret: ?Array<VNode>, i, l, keys, key
  if (Array.isArray(val) || typeof val === 'string') {
    ret = new Array(val.length)
    for (i = 0, l = val.length; i < l; i++) {
      ret[i] = render(val[i], i)
    }
  } else if (typeof val === 'number') {
    ret = new Array(val)
    for (i = 0; i < val; i++) {
      ret[i] = render(i + 1, i)
    }
  } else if (isObject(val)) {
    keys = Object.keys(val)
    ret = new Array(keys.length)
    for (i = 0, l = keys.length; i < l; i++) {
      key = keys[i]
      ret[i] = render(val[key], key, i)
    }
  }
  if (isDef(ret)) {
    (ret: any)._isVList = true
  }
  return ret
}
