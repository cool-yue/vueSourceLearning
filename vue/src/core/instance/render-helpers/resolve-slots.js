/* @flow */

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */

// 处理普通插槽
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  // 该函数返回一个以字符串为字段的Vnode的数组
  // 初始化slots = {};
  const slots = {}
  // 如果children没有
  // 直接就返回slots
  if (!children) {
    return slots
  }
  // 如果children有
  // 定义一个defaultSlot数组
  const defaultSlot = []
  // 遍历children数组
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    // 取出child,也就是一个Vnode
    // child的上下文一致或者函数式上下文一致
    // 并且data存在并且data.slot也存在
    if ((child.context === context || child.functionalContext === context) &&
      child.data && child.data.slot != null
    ) {
      // 在data中取出slot的名字
      const name = child.data.slot
      // 在slots这个对象创建一个以slot名字为键,值为数组
      // 例如默认情况下name = default
      // {default:[]}
      // 并且定义一个变量slot
      // 如果tag是'template',tempalte主要作为一个载体来处理具名slot
      // 例如<slot name="header"></slot>
      // 传入<template slot="header"><div>aaaa</div></tempalte>
      // 此处的tempelate里面的<div>aaa</div>将会替换此处的slot
      // 如果tag是"template"那么该标签里面的内容才是需要被渲染的
      // 那么slot.push直接上push的是child.children
      const slot = (slots[name] || (slots[name] = []))
      if (child.tag === 'template') {
        slot.push.apply(slot, child.children)
      } else {
        // 如果tag不是template
        // 那么就直接压进去
        slot.push(child)
      }
    } else {
      // 如果上下文不一致
      // 或者说child.data.slot没有slot
      // 那么就把child压入defaultSlot
      defaultSlot.push(child)
    }
  }
  // ignore whitespace
  // 确保每个defaultSlot不是空的
  if (!defaultSlot.every(isWhitespace)) {
    // 如果不为空
    // 就把slots.default = defaultSlot
    // 因为有些时候有具名slot,也有默认slot
    // 默认slot放入default
    // 具名slot放入defaultSlot
    slots.default = defaultSlot
  }
  // 最后返回slots
  return slots
}

// 判断空格和注释
function isWhitespace (node: VNode): boolean {
  return node.isComment || node.text === ' '
}

// 作用域插槽
export function resolveScopedSlots (
  fns: ScopedSlotsData, // see flow/vnode
  res?: Object
): { [key: string]: Function } {
  res = res || {}
  for (let i = 0; i < fns.length; i++) {
    if (Array.isArray(fns[i])) {
      resolveScopedSlots(fns[i], res)
    } else {
      res[fns[i].key] = fns[i].fn
    }
  }
  return res
}
