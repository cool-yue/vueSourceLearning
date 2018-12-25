/* @flow */

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */

// 处理普通插槽
// 这个children,是父节点传入的东西,转化成vnode对象
// 这个context是父组件实例
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
  // 遍历children数组,将child的内容装入到slots的这个对象中,最后返回
  // slots的格式为
  /* {
    header:[vnode1,vnode2],
    default:[vnodex]
  }*/
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    // 取出child,也就是一个Vnode
    // child的上下文一致或者函数式上下文一致
    // 并且data存在并且data.slot也存在
    // 这里的上下文这里要说下,如果slot传入的只是个文本节点,那么压根不需要上下文context
    // 但是不代表说,这个文本节点没有上下文,只是说文本节点直接createTextVnode直接就创建
    // 了,没有进行别的复杂话的东西,因为文本基本上可以认为是静态的,而如果slot渲染的是标签
    // 比如div比如bb,原生的也好，自定义的也好,这些都有可能与父组件共享一些东西,比如:props
    // 因此上下文一定要传进去,方便管理这个树形结构
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
  // 这个值是给的vm.$slots
  return slots
}

// 判断空格和注释
function isWhitespace (node: VNode): boolean {
  return node.isComment || node.text === ' '
}



// 作用域插槽
// Vue.prototype._u = resolveScopedSlots; // 处理scopedSlot
// 原始模板
// "<bb><template slot-scope='slotProps'><p>{{slotProps.data}}</p></template></bb>";
// render代码
// "with(this){return _c('bb',{scopedSlots:_u([{key:"default",fn:function(slotProps){return [_c('p',[_v(_s(slotProps.data))])]}}])})}"
// 可以看到这个scopedSlot这个过程,实际上虽然写在了bb里面的<template>上面,实际上呢
// 还是作为了bb的属性,属性名为scopedSlots,实际值为一个函数的运行resolveScopedSlots
// 参数为[{key:"default",fn:function(slotProps){return [_c('p',[_v(_s(slotProps.data))])]}}]
// 从下面的方法可以看出,当render执行的时候,bb元素的scopedSlots属性为一个对象{default:function(slotProps) {return [_c('p',[_v(_s(slotProps.data))])]}}
// 相当于说bb元素有copedSlots属性
// resolveScopedSlots基本上就是把这些属性处理好然后给bb,生成一个带有scopedSlots属性的Vnode
// 对于bb元素的话渲染话,内层肯定也有<div><slot :data="data"></slot></div>
// 这个时候会调用_t()来渲染这个元素
// "with(this){return _c('div',[_t("default",null,{data:data})],2)}"
// 观察_t,可以知道第二个参数实际上是fallBack,就是slot的默认输出，但是现在slot里面什么也没写,所以这里给了null来占位
// 观察第三个参数为{data:data},这个属性就_t的名为props属性的形参
// 现在可以跳到renderSlot里面去看这里如何渲染
// 第一个参数为"default",这个时候就先取出this.$scopedSlots.default,取到的其实就是那个函数
// 可以知道this.$scopedSlots.default,其实是一个函数
// 然后判断有没有这个函数,然后传入{data:data},即function(slotProps) {return [_c('p',[_v(_s(slotProps.a))])]}
// 为什么可以用slotProps.data来访问数据,是因为在解析完模板之后实际上slot-scope='slotProps',中的slotProps会被生成为函数的形参
// 而这个形参的值就是bb组件内部渲染的{data:data},这个data就是<slot :data=data></slot>
// 最终可以在父组件中访问到传给子组件slot上面绑定的的值
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
