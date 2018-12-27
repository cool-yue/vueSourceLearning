/* @flow */

import { emptyNode } from 'core/vdom/patch'
import { resolveAsset, handleError } from 'core/util/index'
import { mergeVNodeHook } from 'core/vdom/helpers/index'

// directive内部实现
// 向外面导出了3个方法,create,update,destroy
export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode: VNodeWithData) {
    updateDirectives(vnode, emptyNode)
  }
}
// create
// 更新指令,
// 首先vnode有directives的属性,他是一个数组
// 数组里面的元素格式为
/*
interface VNodeDirective {
  readonly name: string;
  readonly value: any;
  readonly oldValue: any;
  readonly expression: any;
  readonly arg: string;
  readonly modifiers: { [key: string]: boolean };
}
*/
function updateDirectives (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 如果新的vnode的data有directives或者旧的有directives
  // 那么就应该需要更新指令了
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode)
  }
}

function _update (oldVnode, vnode) {
  // 判断oldVode是不是空
  const isCreate = oldVnode === emptyNode
  // 判断新的vnode是不是空
  const isDestroy = vnode === emptyNode
  // 拿到老的vnode的指令集
  const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context)
  // 拿到新的vnode的指令集
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context)

  const dirsWithInsert = []
  const dirsWithPostpatch = []

  let key, oldDir, dir
  for (key in newDirs) {
    // 以新的dirs为基础进行遍历,取到新的dirs中的每个key
    // 在老的dirs中取到对应的key的值
    oldDir = oldDirs[key]
    // 在新的dirs中取到新的值
    dir = newDirs[key]
    if (!oldDir) {
      // 如果老的dir没有值
      // 证明这是新的指令,然后调用bind钩子函数
      // new directive, bind
      callHook(dir, 'bind', vnode, oldVnode)
      if (dir.def && dir.def.inserted) {
        // 如果有inserted钩子
        // 就压栈到dirsWithInsert
        dirsWithInsert.push(dir)
      }
    } else {
      // 如果老的dir有值,证明这是已存在的
      // 把oldDir里面新的值赋值给dir.oldValue
      // 保存当前备份,便于下一次追踪,能够列出new和old
      // existing directive, update
      dir.oldValue = oldDir.value
      // 调用update钩子函数
      callHook(dir, 'update', vnode, oldVnode)
      // 看options的directive中的有没有定义componentUpdated
      // 定义了就把这个指令进dirsWithPostpatch
      // 翻译下来就是已更新的一个队列
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir)
      }
    }
  }
  // 如果提供了inserted钩子
  if (dirsWithInsert.length) {
    const callInsert = () => {
      // 遍历这个dirsWithInsert
      // 然后疯狂地调用里面的inserted方法
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    if (isCreate) {
      // 如果oldVnode是个空节点,那么新的Vnode中有对应的data.directives,那么这就是一个创建的过程
      // 把insert赋值为callInsert合并到vnode.data.hook中
      // 这里应该是第一次加载的时候调用,从无到有的过程
      mergeVNodeHook(vnode.data.hook || (vnode.data.hook = {}), 'insert', callInsert)
    } else {
      // 正常来说应该调用这里
      callInsert()
    }
  }

  if (dirsWithPostpatch.length) {
    // 调用已更新的钩子
    mergeVNodeHook(vnode.data.hook || (vnode.data.hook = {}), 'postpatch', () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
      }
    })
  }

  if (!isCreate) {
    // 如果isCreate不存在,也就是老的vnode已经有了
    // 在老的vnode中directives中遍历
    for (key in oldDirs) {
      // 如果新的里面没有这个
      // 就解绑,unbind
      // 有没有指令,就看标签上面的绑定了没有
      // 新的元素上面绑定了没有
      if (!newDirs[key]) {
        // no longer present, unbind
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}

// 创建一个新的空的emptyModifiers对象
const emptyModifiers = Object.create(null)

// 标准化指令
function normalizeDirectives (
  dirs: ?Array<VNodeDirective>,// 该vnode的directives属性
  vm: Component// 该vnode的父组件Vue对象
): { [key: string]: VNodeDirective } {
  // 创建一个新的结果集
  const res = Object.create(null)、
  // dirs没有,直接返回
  if (!dirs) {
    return res
  }
  let i, dir
  // 遍历dirs,取到每个指令,如果没有modifiers,就给个空对象
  // 注意这个空对象为同一个对象
  // 在res对象上放一个存有原始路径指令名称(带有modifier的)并指向指令对象
  // 然后在上下文中去找options的directives属性里面对应的directive,例如options.directives.demo
  // 把取到的值重新给个属性叫def
  // 最后返回res
  for (i = 0; i < dirs.length; i++) {
    dir = dirs[i]
    if (!dir.modifiers) {
      dir.modifiers = emptyModifiers
    }
    res[getRawDirName(dir)] = dir
    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true)
  }
  return res
}
// 拿到指令的原始路径风格的名字
// 例如<div v-demo.a.b>
// name的值为demo,modifiers:{a:true,b:true}
// 最后返回demo.a.b
function getRawDirName (dir: VNodeDirective): string {
  return dir.rawName || `${dir.name}.${Object.keys(dir.modifiers || {}).join('.')}`
}

// 调用钩子函数
// 取到dir.hook,例如第一个参数是定义在vm中的directives对象
// 比如directives:{demo:{inserted:xxx,bind:xxx,}}}
// callHook(directives,demo)
function callHook (dir, hook, vnode, oldVnode, isDestroy) {
  const fn = dir.def && dir.def[hook]
  if (fn) {
    try {
      // 调用这个directive.demo上面定义的函数
      // 第一个参数传入vnode.elm,即该组件对应的根元素
      // 第二参数表示这个dir对象
      // 后面几个就不说了,是vnode,实际不需要管
      // 主要是用第一个参数
      // v-directive主要是用来操作dom的,主要用到第一个参数vnode.elm
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy)
    } catch (e) {
      handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`)
    }
  }
}
