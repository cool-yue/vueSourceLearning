/* @flow */

import { extend, cached, camelize } from 'shared/util'

// 驼峰转化
const normalize = cached(camelize)

function createStyle (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 如果新的vnode没有staticStyle
  // 直接更新
  if (!vnode.data.staticStyle) {
    updateStyle(oldVnode, vnode)
    return
  }
  // 如果vnode上面有staticStyle先将这个staticStyle设置到dom上面
  // 然后再更新
  const elm = vnode.elm
  const staticStyle = vnode.data.staticStyle
  for (const name in staticStyle) {
    if (staticStyle[name]) {
      elm.setStyle(normalize(name), staticStyle[name])
    }
  }
  updateStyle(oldVnode, vnode)
}

// 处理data中的style,style是:style,原生的为staticStyle
function updateStyle (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (!oldVnode.data.style && !vnode.data.style) {
    return
  }
  // 运行到这里证明了oldVnode和vnode至少有一个有style属性
  // 拿到dom,拿到新旧style
  let cur, name
  const elm = vnode.elm
  const oldStyle: any = oldVnode.data.style || {}
  let style: any = vnode.data.style || {}

  const needClone = style.__ob__

  // handle array syntax
  // 将data中的style转化成数组对象
  if (Array.isArray(style)) {
    style = vnode.data.style = toObject(style)
  }

  // clone the style for future updates,
  // in case the user mutates the style object in-place.
  if (needClone) {
    style = vnode.data.style = extend({}, style)
  }
  // 对于oldStyle中存在但是newStyel中不存在的
  // 将oldStyle的值替换为""
  // 将newStyle的值替换为当前值
  for (name in oldStyle) {
    if (!style[name]) {
      elm.setStyle(normalize(name), '')
    }
  }
  for (name in style) {
    cur = style[name]
    elm.setStyle(normalize(name), cur)
  }
}

// 数组变成数组对象(key为数字)
function toObject (arr) {
  const res = {}
  for (var i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i])
    }
  }
  return res
}

export default {
  create: createStyle,
  update: updateStyle
}
