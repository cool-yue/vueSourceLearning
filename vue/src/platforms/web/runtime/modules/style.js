/* @flow */

import { getStyle, normalizeStyleBinding } from 'web/util/style'
import { cached, camelize, extend, isDef, isUndef } from 'shared/util'

// 运行时处理的style,处于web paltform里面,也就是说在dom渲染的时候对style做的一些处理
// 下面看看compile的过程
// "<div style='display:none;color:red;' :style='{backgroundColor:black}'></div>"
// with(this){return _c('div',{staticStyle:{"display":"none","color":"red"},style:({backgroundColor:black})})}
// "<div style='display:none;color:red;' :style='[abc,bbb]'></div>"
// with(this){return _c('div',{staticStyle:{"display":"none","color":"red"},style:([abc,bbb])})}

// style跟class很类似,分为静态style和动态style

const cssVarRE = /^--/  // css匹配
const importantRE = /\s*!important$/  // 匹配!important
const setProp = (el, name, val) => {
  /* istanbul ignore if */
  if (cssVarRE.test(name)) {
    // 如果测试到有--开头的值,就直接设置
    el.style.setProperty(name, val)
  } else if (importantRE.test(val)) {
    // 如果碰到!important,把important抽取出来
    // 然后放在第三个参数
    // 这个是setProperty api的要求,详细见MDN
    el.style.setProperty(name, val.replace(importantRE, ''), 'important')
  } else {
    // 没有以上2种情况,那么就先把name标准化
    // 如果val的值是array
    const normalizedName = normalize(name)
    if (Array.isArray(val)) {
      // Support values array created by autoprefixer, e.g.
      // {display: ["-webkit-box", "-ms-flexbox", "flex"]}
      // Set them one by one, and the browser will only set those it can recognize
      for (let i = 0, len = val.length; i < len; i++) {
        // 一个个设置,浏览器只会设置它能够识别的那个值
        el.style[normalizedName] = val[i]
      }
    } else {
      // 如果不是array,很简单直接就赋值了
      el.style[normalizedName] = val
    }
  }
}

// 第三方前缀
// -Webkit- -Moz- -ms-
const vendorNames = ['Webkit', 'Moz', 'ms']

let emptyStyle
// 返回一个合法的css名称,用于dom的操作
const normalize = cached(function (prop) {
  emptyStyle = emptyStyle || document.createElement('div').style
  // 驼峰化
  // 然后判断如果不是filter并且属性在emptyStyle中
  // document.createElement('div').style遍历其中的键值能够得到所有dom的css的js风格属性
  // 在这个里面,表示可以属性可以直接用,如果不在那个可能就是浏览器不兼容的css属性,需要带前缀
  // 需要加前缀
  prop = camelize(prop)
  if (prop !== 'filter' && (prop in emptyStyle)) {
    return prop
  }
  // 把驼峰花的props第一个字母也大写
  const capName = prop.charAt(0).toUpperCase() + prop.slice(1)
  // 'Webkit', 'Moz', 'ms'
  //  找到一个有的
  // 比如chrome浏览器是Webkit
  // 比如moz为火狐的
  // 这些都是在运行时才能够决定
  for (let i = 0; i < vendorNames.length; i++) {
    const name = vendorNames[i] + capName
    if (name in emptyStyle) {
      return name
    }
  }
})

function updateStyle (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  const data = vnode.data
  const oldData = oldVnode.data

  if (isUndef(data.staticStyle) && isUndef(data.style) &&
    isUndef(oldData.staticStyle) && isUndef(oldData.style)
  ) {
    return
  }

  let cur, name
  const el: any = vnode.elm
  const oldStaticStyle: any = oldData.staticStyle
  const oldStyleBinding: any = oldData.normalizedStyle || oldData.style || {}

  // if static style exists, stylebinding already merged into it when doing normalizeStyleData
  const oldStyle = oldStaticStyle || oldStyleBinding

  // 正常情况下vnode.data.style是一个对象或者是一个对象数组
  // 简而言之就是转化成一个标准的对象
  const style = normalizeStyleBinding(vnode.data.style) || {}

  // store normalized style under a different key for next diff
  // make sure to clone it if it's reactive, since the user likley wants
  // to mutate it.

  // 然后判断style对象是否有__ob__
  // 注意:extend相当于一个对象的拷贝
  // 如果是响应式的表示用户可能会改变其中的值
  // 因此要extend进行深拷贝,这样可以通过diff来进行比较
  // 如果没有__ob__证明这里是静态不动的,那么给一个引用给normalizedStyle
  // 如果有就把style并入一个新的对象中,然后赋值给normalizedStyle
  // 否者直接传style的引用,因为有__ob__修改,如果是共一个引用的话,那么全都改了
  // 为了做diff,因此要完全保存一个全新的style对象的拷贝
  vnode.data.normalizedStyle = isDef(style.__ob__)
    ? extend({}, style)
    : style

  const newStyle = getStyle(vnode, true)

  for (name in oldStyle) {
    // 在老的oldStyle中存在，而在新的里面不存在
    // 把值设置为''
    if (isUndef(newStyle[name])) {
      setProp(el, name, '')
    }
  }
  for (name in newStyle) {
    cur = newStyle[name]
    if (cur !== oldStyle[name]) {
      // ie9 setting to null has no effect, must use empty string
      // newStyle里面有,oldStyle也有,但是他们的值不同
      // 这样就设置这新的值
      setProp(el, name, cur == null ? '' : cur)
    }
  }
}

export default {
  create: updateStyle,
  update: updateStyle
}
