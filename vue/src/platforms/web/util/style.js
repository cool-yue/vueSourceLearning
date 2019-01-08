/* @flow */

import { cached, extend, toObject } from 'shared/util'

// 如果绑定的值是个字符串"{'aaa':bbb}"
// 最终将会转化成{aaa:bbb}
// 并且将其缓存
export const parseStyleText = cached(function (cssText) {
  const res = {}
  const listDelimiter = /;(?![^(]*\))/g
  const propertyDelimiter = /:(.+)/
  cssText.split(listDelimiter).forEach(function (item) {
    if (item) {
      var tmp = item.split(propertyDelimiter)
      tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim())
    }
  })
  return res
})

// merge static and dynamic style data on the same vnode
// 将style并入到staticStyle中
// 如果值冲突的,以style里面的为准
// 比如extend({backgroundColor:red},{backgroundColor:blue})
// 最后就成了{backgroundColor:blue}
function normalizeStyleData (data: VNodeData): ?Object {
  const style = normalizeStyleBinding(data.style)
  // static style is pre-processed into an object during compilation
  // and is always a fresh object, so it's safe to merge into it
  return data.staticStyle
    ? extend(data.staticStyle, style)
    : style
}

// normalize possible array / string values into Object
export function normalizeStyleBinding (bindingStyle: any): ?Object {
  // 如果是数组,那么将数组转化为对象
  // 比如[{a:1},{b:2}]
  // 最终将他们转化为{a:1,b:2}
  if (Array.isArray(bindingStyle)) {
    return toObject(bindingStyle)
  }
  // 如果是字符串,就解析字符串形式的style
  if (typeof bindingStyle === 'string') {
    return parseStyleText(bindingStyle)
  }
  // 如果是对象直接返回
  return bindingStyle
}

/**
 * parent component style should be after child's
 * so that parent component's style could override it
 */
// 父组件的style应该在子组件的后面
// 这样父组件的样式可以覆盖掉子组件的
export function getStyle (vnode: VNode, checkChild: boolean): Object {
  const res = {}
  let styleData
  // checkChild设置为true后
  // 会在组件上找componentInstance
  // 然后把子组件的style抽取出来
  if (checkChild) {
    let childNode = vnode
    while (childNode.componentInstance) {
      childNode = childNode.componentInstance._vnode
      if (childNode.data && (styleData = normalizeStyleData(childNode.data))) {
        extend(res, styleData)
      }
    }
  }

  // 抽取父组件的style,并入res
  if ((styleData = normalizeStyleData(vnode.data))) {
    extend(res, styleData)
  }

  // 抽取祖先元素的style并入res
  let parentNode = vnode
  while ((parentNode = parentNode.parent)) {
    if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
      extend(res, styleData)
    }
  }
  return res


}

