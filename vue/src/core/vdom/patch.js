/**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by Evan You (@yyx990803)
 *

/*
 * Not type-checking this because this file is perf-critical and the cost
 * of making flow understand it is not worth it.
 */

import VNode from './vnode'
import config from '../config'
import { SSR_ATTR } from 'shared/constants'
import { registerRef } from './modules/ref'
import { activeInstance } from '../instance/lifecycle'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  makeMap,
  isPrimitive
} from '../util/index'

export const emptyNode = new VNode('', {}, [])

// directive,event渲染等几个钩子
// module模块中定义的几个钩子
// 由于跟平台有关系,比如在web平台下会有window,dom的环境
// 在服务器端渲染没有dom的环境
// 像自定义的事件通过emit来触发,但是原生事件,归根揭底还是addEventListener来触发
// 关键问题就是如何addEventListener是dom的方法,dom事件的渲染必须是在dom已经创建的时候
// 所以在createEle这个方法中会执行这些钩子,从而渲染和绑定基于dom才有的一些东西
// 其中create和update基本上是dom需要的
// activate,remove是transition需要的
const hooks = ['create', 'activate', 'update', 'remove', 'destroy']

// 值得比,也就是同一个Vnode节点
// 通过判断tag,isComment
function sameVnode (a, b) {
  // 判断是不是同一个的Vnode
  // 首先key要一样
  // 其次tag要一样
  // 如果没有tag,那应该都是注释节点
  // 如果又不是注释节点,那么2个vnode必须要都定义data
  // 并且a和b有同样的Input type
  // 判断是否值得比,如果元素不一样标签都不一样
  // 那就直接替换,如果父标签一样,那么就到去updateChildren
  return (
    a.key === b.key && (
      (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        sameInputType(a, b)
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        a.asyncFactory === b.asyncFactory &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}

// Some browsers do not support dynamically changing type for <input>
// so they need to be treated as different nodes
// 一些浏览器不支持动态地改变input的type,修改了之后,由于不支持,还是同一个元素
// 所以一旦修改了type,就应该认为它们不是同一个node
// 同样的input
function sameInputType (a, b) {
  if (a.tag !== 'input') return true
  let i
  const typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type
  const typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type
  return typeA === typeB
}

// 为old节点创建一个key的map集合,高效提高diff算法的dom操作复用
// 而不是重新创建元素
// 这里创建的是key跟index进行对应
// 加入children的dom是<div key="one"></div><div key="two"></div>
// 那么 key为one的对应索引0
// key为two的对应索引1
function createKeyToOldIdx (children, beginIdx, endIdx) {
  let i, key
  const map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) map[key] = i
  }
  return map
}

// 这是一个800行的函数,最后返回一个patch方法
export function createPatchFunction (backend) {
  let i, j
  const cbs = {}
  // nodeOps为一套dom的操作方法
  // modules操作为ref,directive,events等一些操作
  // modules会根据平台的特性来选择性加载
  // 比如在web平台中,会有attrs,class,dom-props,events,style,transition等几个特性
  // 每个模块都会返回一个对象
  // {create:xxx,update:xxx}
  const { modules, nodeOps } = backend
  // 将回调压入到cb中,并且以hook中的值为key
  // const hooks = ['create', 'activate', 'update', 'remove', 'destroy']
  // 寻找绑定的ref和directive的钩子函数
  // 例如cbs:{create:[attr中的create,class中的create,dom-props中的create,style中的create,transitions中的create]},这个数组存放所有的create函数
  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = []
    for (j = 0; j < modules.length; ++j) {
      if (isDef(modules[j][hooks[i]])) {
        cbs[hooks[i]].push(modules[j][hooks[i]])
      }
    }
  }
// 创建一个tag = elm.tagName的空Vnode
  function emptyNodeAt (elm) {
    return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
  }

// 创建一个闭包,共享几个变量childElm，listenrs
  function createRmCb (childElm, listeners) {
    function remove () {
      if (--remove.listeners === 0) {
        removeNode(childElm)
      }
    }
    remove.listeners = listeners
    return remove
  }

  // 移除el元素
  function removeNode (el) {
    const parent = nodeOps.parentNode(el)
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el)
    }
  }

  let inPre = 0
  // 创建元素
  function createElm (vnode, insertedVnodeQueue, parentElm, refElm, nested) {
    // 是否作为根节点插入,作为transition的时候为false
    vnode.isRootInsert = !nested // for transition enter check
    // 如果穿件component成功,就返回
    // 什么情况下这里createComponent会成功
    // 就是在vnode为自定义组件的时候,换句话说就是vnode的tag为"vue-component-n-abc"
    // 这个createComponent里面做了什么事情呢
    // 就是调用了vnode上面的hook.init
    // hook.init做的事情就是vnode.componentInstance = createComponentInstanceForVnode(vnode)
    // createComponentInstanceForVnode里面会传入parent,parent为acitiveInstance,也就是上一次vm._update的vm
    // 举个例子就是跟组件渲染的时候,内部有个abc组件,abc组件的parent就是根组件实例
    // 如果abc下面还有自定义组件<def>那么<def>的parent就是abc,同时在initLifeCycle的时候
    // 会把具有parent的$children.push(vm),会把具有parent的vm,vm.$parent = parent
    // 不扯远了,后面就是调用了vnode.componentOption上面的Ctor,并且传入并入的3个属性_parentVnode就是自己
    // parent是activeInstance,然后实例化
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }
    // 创建component不成功
    // 拿到vnode的data值
    // 拿到children的值
    // 拿到tag的值
    const data = vnode.data
    const children = vnode.children
    const tag = vnode.tag
    if (isDef(tag)) {
      if (process.env.NODE_ENV !== 'production') {
        if (data && data.pre) {
          inPre++
        }
        if (
          !inPre &&
          !vnode.ns &&
          !(config.ignoredElements.length && config.ignoredElements.indexOf(tag) > -1) &&
          config.isUnknownElement(tag)
        ) {
          warn(
            'Unknown custom element: <' + tag + '> - did you ' +
            'register the component correctly? For recursive components, ' +
            'make sure to provide the "name" option.',
            vnode.context
          )
        }
      }
      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode)//这是真的创建DOM,一般会走这里,不考虑命名空间
      setScope(vnode)

      /* istanbul ignore if */
      if (__WEEX__) {
        // in Weex, the default insertion order is parent-first.
        // List items can be optimized to use children-first insertion
        // with append="tree".
        const appendAsTree = isDef(data) && isTrue(data.appendAsTree)
        if (!appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
        createChildren(vnode, children, insertedVnodeQueue)
        if (appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          // 这里是个递归的过程
          insert(parentElm, vnode.elm, refElm)
        }
      } else {
        createChildren(vnode, children, insertedVnodeQueue)
        if (isDef(data)) {
          // 这个主要针对的是ref和directive,module一些渲染,比如dom事件 属性的监听和绑定
          // ref是在这个元素被渲染之后,把该元素的vm.componentInstance||vnode.elm放在ref对象
          // 运行到这里如果vnode有data,证明标签上面有属性或者事件或者directvie或者ref等等
          // 那么调用modules中并入的各种create钩子函数
          // 这一步相当于说当dom创建好了,vnode里面data有关于dom的一些属性,事件监听
          // 需要继续去绑定和监听
          invokeCreateHooks(vnode, insertedVnodeQueue)
        }
        // 运行到这里vnode.elm已经填入了子元素,并且已经绑定了data中应该在dom上渲染是的属性和事件
        // 然后执行插入完成dom的渲染
        // 这里存在各种递归的操作,最终运行到栈中最后一个insert的时候,dom渲染完毕
        insert(parentElm, vnode.elm, refElm)
      }

      if (process.env.NODE_ENV !== 'production' && data && data.pre) {
        inPre--
      }
    } else if (isTrue(vnode.isComment)) {
      vnode.elm = nodeOps.createComment(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    } else {
      vnode.elm = nodeOps.createTextNode(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    }
  }

  // 创建组件
  // 这个方法主要是针对非内建标签的vnode tag,然后通过其componentOptions上的Ctor
  // 通过这个方法来创建vue实例,将这个实例化后的vue实例放在cmponentInstance上面
  function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    // 拿到vnode的相关属性
    let i = vnode.data
    // 如果有data属性,如果没有data属性createComponent为false
    // 这个vnode只有一个光标签
    if (isDef(i)) {
      // 如果vnode上面有componentInstance,并且选项中有keepAlive
      const isReactivated = isDef(vnode.componentInstance) && i.keepAlive
      // 如果data里面有hook,并且data里面有init
      if (isDef(i = i.hook) && isDef(i = i.init)) {
        // 这个时候init(vnode)
        // 调用componentOption上面的Ctor创建vue实例
        // i里面是创建vue实例然后加挂载
        // 实例放在vnode的componentInstance上面
        // 挂载mount(undefined)
        i(vnode, false /* hydrating */, parentElm, refElm)
      }
      // after calling the init hook, if the vnode is a child component
      // it should've created a child instance and mounted it. the child
      // component also has set the placeholder vnode's elm.
      // in that case we can just return the element and be done.
      if (isDef(vnode.componentInstance)) {
        // 如果vnode上面已经有instance了
        // initComponent(vnode)
        initComponent(vnode, insertedVnodeQueue)
        if (isTrue(isReactivated)) {
          // 如果是有keepAlive选项
          // 那么就reactivateComponent
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm)
        }
        return true
      }
    }
  }

  function initComponent (vnode, insertedVnodeQueue) {
    if (isDef(vnode.data.pendingInsert)) {
      // 如果data里面有pendingInsert
      // 把pendingInsert push到insertedVnodeQueue中
      // 然后把pendingInsert置为null
      insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert)
      vnode.data.pendingInsert = null
    }
    // 把componentInstance中的$el赋值给vnode.elm
    vnode.elm = vnode.componentInstance.$el
    if (isPatchable(vnode)) {
      invokeCreateHooks(vnode, insertedVnodeQueue)
      setScope(vnode)
    } else {
      // empty component root.
      // skip all element-related modules except for ref (#3455)
      registerRef(vnode)
      // make sure to invoke the insert hook
      insertedVnodeQueue.push(vnode)
    }
  }

  function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    let i
    // hack for #4339: a reactivated component with inner transition
    // does not trigger because the inner node's created hooks are not called
    // again. It's not ideal to involve module-specific logic in here but
    // there doesn't seem to be a better way to do it.
    let innerNode = vnode
    while (innerNode.componentInstance) {
      innerNode = innerNode.componentInstance._vnode
      if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
        for (i = 0; i < cbs.activate.length; ++i) {
          cbs.activate[i](emptyNode, innerNode)
        }
        insertedVnodeQueue.push(innerNode)
        break
      }
    }
    // unlike a newly created component,
    // a reactivated keep-alive component doesn't insert itself
    insert(parentElm, vnode.elm, refElm)
  }

  function insert (parent, elm, ref) {
    if (isDef(parent)) {
      if (isDef(ref)) {
        if (ref.parentNode === parent) {
          nodeOps.insertBefore(parent, elm, ref)
        }
      } else {
        nodeOps.appendChild(parent, elm)
      }
    }
  }

  function createChildren (vnode, children, insertedVnodeQueue) {
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; ++i) {
        // 循环创建元素,createElement
        createElm(children[i], insertedVnodeQueue, vnode.elm, null, true)
      }
    } else if (isPrimitive(vnode.text)) {
      // children不是array,那就没有children
      // 在vnode中拿到text
      // 然后插到elm中
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(vnode.text))
    }
  }
// 是不是能够打补丁?即能够更新它的elm
  function isPatchable (vnode) {
     // 这里来个循环判断,判断vnode.componentInstance
      // 只要vnode.componentInstance存在就去拿vnode.componentInstacne._vnode
      // 然后继续拿componentInstance._vnode,一直到没有componentInstance为止
      // 这个时候当没有挂载componentInstance之后
      // 看这个vNode有没有tag
    while (vnode.componentInstance) {
      vnode = vnode.componentInstance._vnode
    }
    return isDef(vnode.tag)
  }
// 触发CreateHooks
  function invokeCreateHooks (vnode, insertedVnodeQueue) {
    // 遍历在cbs.create属性数组然后调用
    // create(空vNode,vnode),后面是传入的vnode
    for (let i = 0; i < cbs.create.length; ++i) {
      cbs.create[i](emptyNode, vnode)
    }
    // 拿到data中的hook
    i = vnode.data.hook // Reuse variable
    if (isDef(i)) {
      // 如果hook里面有create和insert就调用
      // 把insert push到 insertedVnodeQueue
      if (isDef(i.create)) i.create(emptyNode, vnode)
      if (isDef(i.insert)) insertedVnodeQueue.push(vnode)
    }
  }

  // set scope id attribute for scoped CSS.
  // this is implemented as a special case to avoid the overhead
  // of going through the normal attribute patching process.
  function setScope (vnode) {
    let i
    let ancestor = vnode
    while (ancestor) {
      if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
        nodeOps.setAttribute(vnode.elm, i, '')
      }
      ancestor = ancestor.parent
    }
    // for slot content they should also get the scopeId from the host instance.
    if (isDef(i = activeInstance) &&
      i !== vnode.context &&
      isDef(i = i.$options._scopeId)
    ) {
      nodeOps.setAttribute(vnode.elm, i, '')
    }
  }

  function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm)
    }
  }

  // 触发一个vnode的destroy钩子函数
  function invokeDestroyHook (vnode) {
    // 递归地调用vnode上所有data.hook上面的destroyer钩子函数
    // 并且调用cbs中的destroyer函数
    // 有children,就递归地去调用children的一些东西
    let i, j
    const data = vnode.data
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode)
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode)
    }
    if (isDef(i = vnode.children)) {
      for (j = 0; j < vnode.children.length; ++j) {
        invokeDestroyHook(vnode.children[j])
      }
    }
  }

  // removeVnodes,移除vnodes中索引从startIdx到endIdx的vnodes
  // vnodes可以认为是一组同级children
  // 如果定义了tag证明是元素,remove并且触发removeHook,remove之后再触发destroy hook
  // 如果没有tag,证明是文本节点,这个时候就操作dom,移除该dom
  function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch)
          invokeDestroyHook(ch)
        } else { // Text node
          removeNode(ch.elm)
        }
      }
    }
  }
// 移除并且触发移除的hook
// 实际上也是移除该元素的作用,如果tag有值的话
// vnode有data的话或者提供了rm
//
  function removeAndInvokeRemoveHook (vnode, rm) {
    if (isDef(rm) || isDef(vnode.data)) {
      let i
      const listeners = cbs.remove.length + 1
      if (isDef(rm)) {
        // we have a recursively passed down rm callback
        // increase the listeners count
        rm.listeners += listeners
      } else {
        // directly removing
        rm = createRmCb(vnode.elm, listeners)
      }
      // recursively invoke hooks on child component root node
      if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
        removeAndInvokeRemoveHook(i, rm)
      }
      for (i = 0; i < cbs.remove.length; ++i) {
        cbs.remove[i](vnode, rm)
      }
      if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
        i(vnode, rm)
      } else {
        rm()
      }
    } else {
      removeNode(vnode.elm)
    }
  }

  // diff算法
  function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    let oldStartIdx = 0
    let newStartIdx = 0
    let oldEndIdx = oldCh.length - 1
    let oldStartVnode = oldCh[0]
    let oldEndVnode = oldCh[oldEndIdx]
    let newEndIdx = newCh.length - 1
    let newStartVnode = newCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx, idxInOld, elmToMove, refElm

    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    const canMove = !removeOnly

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue)
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue)
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        idxInOld = isDef(newStartVnode.key) ? oldKeyToIdx[newStartVnode.key] : null
        if (isUndef(idxInOld)) { // New element
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm)
          newStartVnode = newCh[++newStartIdx]
        } else {
          elmToMove = oldCh[idxInOld]
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !elmToMove) {
            warn(
              'It seems there are duplicate keys that is causing an update error. ' +
              'Make sure each v-for item has a unique key.'
            )
          }
          if (sameVnode(elmToMove, newStartVnode)) {
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue)
            oldCh[idxInOld] = undefined
            canMove && nodeOps.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm)
            newStartVnode = newCh[++newStartIdx]
          } else {
            // same key but different element. treat as new element
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm)
            newStartVnode = newCh[++newStartIdx]
          }
        }
      }
    }
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
  }

  // 分析一下patchVnode这个方法
  function patchVnode (oldVnode, vnode, insertedVnodeQueue, removeOnly) {
    // 如果vnode和oldVnode完全相等,那么就没有什么patch的
    if (oldVnode === vnode) {
      return
    }
    // 这个2个vnode不同,那么将old公共的elm赋值给elm
    const elm = vnode.elm = oldVnode.elm

    // 是一个异步占位符?这里先不管
    if (isTrue(oldVnode.isAsyncPlaceholder)) {
      if (isDef(vnode.asyncFactory.resolved)) {
        hydrate(oldVnode.elm, vnode, insertedVnodeQueue)
      } else {
        vnode.isAsyncPlaceholder = true
      }
      return
    }

    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.

    // 如果这里vnode是个静态的,且他们的key也一样
    // 那么就把oldVnode.compoentInstance赋值给vnode.compoentInstance
    // 然后patch完毕,因为是静态的,所以不会变,因此只要把老的组件实例弄过来就够了
    // 不需要进行别的操作
    if (isTrue(vnode.isStatic) &&
      isTrue(oldVnode.isStatic) &&
      vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
      vnode.componentInstance = oldVnode.componentInstance
      return
    }

    // 前面的条件都不满足,ok,现在开始patch
    let i
    // 拿到vnode的data
    const data = vnode.data
    // data.hook里面有没有prepatch
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
      // 有就prepatch
      // 这里运行prepatch
      i(oldVnode, vnode)
    }

    const oldCh = oldVnode.children
    const ch = vnode.children
    if (isDef(data) && isPatchable(vnode)) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      nodeOps.setTextContent(elm, vnode.text)
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.postpatch)) i(oldVnode, vnode)
    }
  }

  // 触发InsertHook
  function invokeInsertHook (vnode, queue, initial) {
    // delay insert hooks for component root nodes, invoke them after the
    // element is really inserted
    if (isTrue(initial) && isDef(vnode.parent)) {
      // 如果是初始化,那么vnode.parent.data.pendingInsert赋值为queue;
      vnode.parent.data.pendingInsert = queue
    } else {
      // 如果不是初始化
      // 或者没有父元素
      // 那么就调用insert
      for (let i = 0; i < queue.length; ++i) {
        queue[i].data.hook.insert(queue[i])
      }
    }
  }

  let bailed = false
  // list of modules that can skip create hook during hydration because they
  // are already rendered on the client or has no need for initialization

  // isRenderedModule是一个函数,维护下面这个列表,如果传入下面这个列表中的值就返回true
  const isRenderedModule = makeMap('attrs,style,class,staticClass,staticStyle,key')

  // Note: this is a browser-only function so we can assume elms are DOM nodes.
  function hydrate (elm, vnode, insertedVnodeQueue) {
    if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
      vnode.elm = elm
      vnode.isAsyncPlaceholder = true
      return true
    }
    if (process.env.NODE_ENV !== 'production') {
      if (!assertNodeMatch(elm, vnode)) {
        return false
      }
    }
    vnode.elm = elm
    const { tag, data, children } = vnode
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) i(vnode, true /* hydrating */)
      if (isDef(i = vnode.componentInstance)) {
        // child component. it should have hydrated its own tree.
        initComponent(vnode, insertedVnodeQueue)
        return true
      }
    }
    if (isDef(tag)) {
      if (isDef(children)) {
        // empty element, allow client to pick up and populate children
        if (!elm.hasChildNodes()) {
          createChildren(vnode, children, insertedVnodeQueue)
        } else {
          let childrenMatch = true
          let childNode = elm.firstChild
          for (let i = 0; i < children.length; i++) {
            if (!childNode || !hydrate(childNode, children[i], insertedVnodeQueue)) {
              childrenMatch = false
              break
            }
            childNode = childNode.nextSibling
          }
          // if childNode is not null, it means the actual childNodes list is
          // longer than the virtual children list.
          if (!childrenMatch || childNode) {
            if (process.env.NODE_ENV !== 'production' &&
              typeof console !== 'undefined' &&
              !bailed
            ) {
              bailed = true
              console.warn('Parent: ', elm)
              console.warn('Mismatching childNodes vs. VNodes: ', elm.childNodes, children)
            }
            return false
          }
        }
      }
      if (isDef(data)) {
        for (const key in data) {
          if (!isRenderedModule(key)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
            break
          }
        }
      }
    } else if (elm.data !== vnode.text) {
      elm.data = vnode.text
    }
    return true
  }

// 断言2个Vnode是否匹配
  function assertNodeMatch (node, vnode) {
    // 如果vnode存在tag属性那么就看
    // 是不是vue-component开头 或者 vnode的tagName 跟 node的tag一样
    // 满足上面2个条件其中一个的都返回true
    // vue-component开头的为自定义组件,其余的为内建组件
    if (isDef(vnode.tag)) {
      return (
        vnode.tag.indexOf('vue-component') === 0 ||
        vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase())
      )
    } else {
      // 当node节点没有tag,那么这个节点肯定不是元素节点
      // 就看vnode是不是注释节点,如果vnode是注释节点那么就判断node是不是nodeType为8
      // 其余情况下就看node的nodetype是不是为3
      // 满足8或者3的情况就返回true
      return node.nodeType === (vnode.isComment ? 8 : 3)
    }
  }

  // 核心方法patch!
  // 就是把新生成的vnode的节点对应的dom,打补丁到旧的节点上,使得这2个节点一致
  return function patch (oldVnode, vnode, hydrating, removeOnly, parentElm, refElm) {
    // 新节点直接是null了
    // 表示做了完全移除的操作
    if (isUndef(vnode)) {
      // oldVnode触发DestroyerHook
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
      return
    }
    // 新节点正常的修改逻辑从这里开始
    // 首先设置一个字段,是不是初始化的更新,将其设置为false
    let isInitialPatch = false
    // 初始化一个insertedVnodeQueue,按字面理解它是一个已插入的Vnode的队列
    // 他是一个数组
    // 这里面存放的都是自定义组件,在render的时候,最后循环调用这个队列的mounted钩子函数
    const insertedVnodeQueue = []

    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element
      // 如果oldVnode都没有定义
      // 那么就认为是初始化的更新,创建vnode对应的dom
      // 这里主要是针对$mount()里面没有传入值的情况,query(null)
      // 还有这里是针对父组件内部的自定义组件
      // 例如<div><abc></abc></div>
      // <abc></abc>会这么来挂载mount(undefined)
      // 初始化更新
      isInitialPatch = true
      createElm(vnode, insertedVnodeQueue, parentElm, refElm)
    } else {
      // 以下有2种情况
      // 第一种第一次挂载的时候并且传入了$el,此时oldVnode是一个元素节点,query(selector)
      // 第二种情况是就是正常的patch更新
      const isRealElement = isDef(oldVnode.nodeType)
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // patch existing root node
        patchVnode(oldVnode, vnode, insertedVnodeQueue, removeOnly)
      } else {
        if (isRealElement) {
          // oldVnode如果这里真的是一个dom元素
          // mounting to a real element
          // check if this is server-rendered content and if we can perform
          // a successful hydration.
          if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            // 有ssr_attr属性
            oldVnode.removeAttribute(SSR_ATTR)
            hydrating = true
          }
          if (isTrue(hydrating)) {
            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
              invokeInsertHook(vnode, insertedVnodeQueue, true)
              return oldVnode
            } else if (process.env.NODE_ENV !== 'production') {
              warn(
                'The client-side rendered virtual DOM tree is not matching ' +
                'server-rendered content. This is likely caused by incorrect ' +
                'HTML markup, for example nesting block-level elements inside ' +
                '<p>, or missing <tbody>. Bailing hydration and performing ' +
                'full client-side render.'
              )
            }
          }
          // either not server-rendered, or hydration failed.
          // create an empty node and replace it
          // 不是server-rendered 也不是 hydration 失败
          // 就把oldVnode赋值为一个空的Vnode
          oldVnode = emptyNodeAt(oldVnode)
        }
        // replacing existing element
        // 从这里开始就是正常的patch了
        // 拿到oldVnode的elm
        // 同时拿到elm的父元素
        // 开始创建元素Vnode转化为元素
        const oldElm = oldVnode.elm
        const parentElm = nodeOps.parentNode(oldElm)
        createElm(
          vnode,
          insertedVnodeQueue,
          // extremely rare edge case: do not insert if old element is in a
          // leaving transition. Only happens when combining transition +
          // keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm)
        )
        // 如果vnode.parent存在
        if (isDef(vnode.parent)) {
          // component root element replaced.
          // update parent placeholder node element, recursively

          // 这里把vnode的上级parent的parent无限下去的elm赋值为vnode的elm
          let ancestor = vnode.parent
          while (ancestor) {
            ancestor.elm = vnode.elm
            ancestor = ancestor.parent
          }
          // 如果vnode可以patch
          // 就调用所有的cb.create中的函数
          if (isPatchable(vnode)) {
            for (let i = 0; i < cbs.create.length; ++i) {
              cbs.create[i](emptyNode, vnode.parent)
            }
          }
        }
        // 如果parentEle定义了
        // 就删掉oldVnode
        if (isDef(parentElm)) {
          removeVnodes(parentElm, [oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          // 如果oldVnode.tag存在
          // 触发destroy钩子
          invokeDestroyHook(oldVnode)
        }
      }
    }
    // 最后调用vnode的InsertHook
    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)

    // 返回vnode的元素
    return vnode.elm
  }
}
