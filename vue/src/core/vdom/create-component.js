/* @flow */

import VNode from './vnode'
import { resolveConstructorOptions } from 'core/instance/init'
import { queueActivatedComponent } from 'core/observer/scheduler'
import { createFunctionalComponent } from './create-functional-component'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject
} from '../util/index'

import {
  resolveAsyncComponent,
  createAsyncPlaceholder,
  extractPropsFromVNodeData
} from './helpers/index'

import {
  callHook,
  activeInstance,
  updateChildComponent,
  activateChildComponent,
  deactivateChildComponent
} from '../instance/lifecycle'

// hooks to be invoked on component VNodes during patch
// 并入VNode的一些钩子函数,这几个钩子属于必须调用的,区别于对外暴露给用户的那几个钩子
// 这里的钩子是用这些设计模式,来方便进行包装新的逻辑
const componentVNodeHooks = {
  // init钩子
  // 如果vnode上面没有componentInstance 或者 有但是已经destroye了
  // 也就是说vnode上面没有componentInstance ,然后就为Vnode创建componentInstance
  //
  init (
    vnode: VNodeWithData,
    hydrating: boolean,
    parentElm: ?Node,
    refElm: ?Node
  ): ?boolean {
    if (!vnode.componentInstance || vnode.componentInstance._isDestroyed) {
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance,
        parentElm,
        refElm
      )
      // 创建child的实例,挂载在vnode.elm上
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    } else if (vnode.data.keepAlive) {
      // kept-alive components, treat as a patch
      // 如果有keepAlive属性,那么就把vnode赋值给mountedNode
      // 然后调用prePatch,但是传入的值是一样的,old和new一样
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    }
  },

  // 预补丁
  // oldVnode,vnode
  // 这里是2个vNode来打补丁,
  //
  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    /* componentOptions中拥有以下几个属性
      Ctor: ƒ VueComponent(options)
      children: undefined
      listeners: undefined
      propsData: undefined
      tag: "def"
    */
    // 把新的componentOptions赋值给options
    // 把old的componentInstance 给新的,同时赋值给一个child
    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance
    // child是一个vm
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },

  insert (vnode: MountedComponentVNode) {
    // 拿到vnode的context和componentInstance
    // 如果没有挂载,那么就赋值为挂载,触发mounted
    // 如果有keepAlive,如果上下文对象vm_isMounted
    // 就把当前实例放入active队列
    // 如果没挂载,直接就activateChildComponent,
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },

  // destroy函数
  destroy (vnode: MountedComponentVNode) {
    const { componentInstance } = vnode
    // 拿到vnode的componentInstance
    // 如果_isDestroyed是false,就是没有销毁
    // 再判断是否有keepAlive属性,如果没有就正常的$destroy()
    // 如果有keep-alive就deactivateChildComponent
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy()
      } else {
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}

// 把上面定义的钩子的键组成一个数组然后交给一个对象
// ["init","prepatch","insert","destroy"]
const hooksToMerge = Object.keys(componentVNodeHooks)

export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | void {
  if (isUndef(Ctor)) {
    return
  }
// 如果第一个参数都没有,那么就不运行
// context实际上是一个vm实例,_base是一个Vue构造函数
  const baseCtor = context.$options._base

  // plain options object: turn it into a constructor
// 如果Ctor是一个对象,那么就通过Vue.extend(Ctor)创建一个构造函数
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor)
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
  // 如果Ctor还不是函数,这就要报错了
  if (typeof Ctor !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid Component definition: ${String(Ctor)}`, context)
    }
    return
  }

  // async component
  // 异步组件,这里先不考虑了
  // 运行到这里Ctor是一个构造函数
  let asyncFactory
  if (isUndef(Ctor.cid)) {
    // 如果有cid的话
    // 就把这个构造函数赋值给asyncFactory
    asyncFactory = Ctor
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor, context)
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  // 拿到VNodeData
  data = data || {}

  // resolve constructor options in case global mixins are applied after
  // component constructor creation

  // 处理全局混入,保证全局混入能够应用
  resolveConstructorOptions(Ctor)

  // transform component v-model data into props & events
  //如果data里面有model属性,那么肯定定义了v-model,那么就转化v-model
  // 把v-model转化成具体的实现逻辑
  if (isDef(data.model)) {
    transformModel(Ctor.options, data)
  }

  // extract props
  // 就是提取props,提取data中的
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  // functional component
  // 如果有functional字段设置为true,那么就返回一个函数式组件
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners

  // 这里拿到@xxx="xxx",放入到listener
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  // 然后把原生事件给data.on
  data.on = data.nativeOn

  // 如果组件插入了abstract那么只保留slot
  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot
    // work around flow
    // 抽象组件例如keep-alive
    const slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }

  // merge component management hooks onto the placeholder node
  // 这里把data的hook属性上并入这些属性["init","prepatch","insert","destroy"]
  mergeHooks(data)

  // return a placeholder vnode
  // 取到Ctor中的name,如果没有就把tag给name
  // 这里的代码说明了,如果给一个组件name属性,会优先使用
  // 这个name来当做比如vue-component-name
  // 如果没取名字就默认使用标签名
  const name = Ctor.options.name || tag
  // 最后new一个VNode出来,tag名字为vue-component-name开头
  // data为合并后的data
  // 创建一个不带children的Vnode
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )
  // 最后返回这个Vnode
  return vnode
}

// 在组件上创建组件实例
// 并将vnode.componentOptions扩展一下
// 并入了render和staticRenderFns
// 并入了_isComponent = true
// parent,vnodeComponentOptions.propsData
// 最后使用vnode.componentOptions.ctor进行实例化
export function createComponentInstanceForVnode (
  vnode: any, // we know it's MountedComponentVNode but flow doesn't
  parent: any, // activeInstance in lifecycle state
  parentElm?: ?Node,
  refElm?: ?Node
): Component {
  // 拿到vnode的componentOptions,并把其中的propsData,tag,listeners,children
  // 然后赋值给options
  const vnodeComponentOptions = vnode.componentOptions
  const options: InternalComponentOptions = {
    _isComponent: true,
    parent,
    propsData: vnodeComponentOptions.propsData,
    _componentTag: vnodeComponentOptions.tag,
    _parentVnode: vnode,
    _parentListeners: vnodeComponentOptions.listeners,
    _renderChildren: vnodeComponentOptions.children,
    _parentElm: parentElm || null,
    _refElm: refElm || null
  }
  // check inline-template render functions
  // 取到data中的inlineTemplate
  const inlineTemplate = vnode.data.inlineTemplate
  if (isDef(inlineTemplate)) {
    // 如果存在inlineTemplate
    // 就把这个属性的render和staticRenderFns给options
    options.render = inlineTemplate.render
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }
  // new 一个 vnodeComponentOptions.Ctor,传入options,并返回
  // Ctor为一个组件的构造函数,这里相当于返回一个vm
  return new vnodeComponentOptions.Ctor(options)
}

// 再vnode的data属性中合并中添加hook
// 如果data里面有同名的hook了,就merge,2个都要
// 如果没有就把我们写死的hook放进这个hook里面
function mergeHooks (data: VNodeData) {
  if (!data.hook) {
    data.hook = {}
  }
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i]
    const fromParent = data.hook[key]
    const ours = componentVNodeHooks[key]
    data.hook[key] = fromParent ? mergeHook(ours, fromParent) : ours
  }
}

// 合并hook
function mergeHook (one: Function, two: Function): Function {
  return function (a, b, c, d) {
    one(a, b, c, d)
    two(a, b, c, d)
  }
}

// transform component v-model info (value and callback) into
// prop and event handler respectively.
// 转化v-model
// 这是一个经典的语法糖
// 默认情况下,prop属性为'value'
// 事件为'input'
// 在data上建立一个props对象,把该props.value = data.model.value
// 取出data上的on,并取到on['input'],
// 如果有on['input']表示用户自定义了,然后就把data.model.callback和用户自定义的合并
// 如果没有,也就是基本上只定义了一个v-model那么就用data.model.callback
function transformModel (options, data: any) {
  const prop = (options.model && options.model.prop) || 'value'
  const event = (options.model && options.model.event) || 'input'
  ;(data.props || (data.props = {}))[prop] = data.model.value
  const on = data.on || (data.on = {})
  if (isDef(on[event])) {
    on[event] = [data.model.callback].concat(on[event])
  } else {
    on[event] = data.model.callback
  }
}
