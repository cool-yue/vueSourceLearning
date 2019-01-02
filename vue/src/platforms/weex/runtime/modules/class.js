/* @flow */

// 这些都是weex平台的,先不管吧
import { extend } from 'shared/util'

function updateClass (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  const el = vnode.elm
  const ctx = vnode.context

  const data: VNodeData = vnode.data
  const oldData: VNodeData = oldVnode.data
  if (!data.staticClass &&
    !data.class &&
    (!oldData || (!oldData.staticClass && !oldData.class))
  ) {
    return
  }

  const oldClassList = []
  // unlike web, weex vnode staticClass is an Array
  const oldStaticClass: any = oldData.staticClass
  if (oldStaticClass) {
    oldClassList.push.apply(oldClassList, oldStaticClass)
  }
  if (oldData.class) {
    oldClassList.push.apply(oldClassList, oldData.class)
  }

  const classList = []
  // unlike web, weex vnode staticClass is an Array
  const staticClass: any = data.staticClass
  if (staticClass) {
    classList.push.apply(classList, staticClass)
  }
  if (data.class) {
    classList.push.apply(classList, data.class)
  }

  const style = getStyle(oldClassList, classList, ctx)
  for (const key in style) {
    el.setStyle(key, style[key])
  }
}

function getStyle (oldClassList: Array<string>, classList: Array<string>, ctx: Component): Object {
  // style 是一个仅在weex上面注入的对象
  // 将<style>解析然后放入weex files
  // style is a weex-only injected object
  // compiled from <style> tags in weex files

  // 拿到vm实例的style属性,如果属性没有就初始化一个空对象
  // 用classList里面的每个元素的值,作为ctx的style属性里
  // 的key,去取值然后扩展到result上面
  // 同样去oldClassList里面去取值,如果在新的classList里面没有就将该值设置为空字符串
  const stylesheet: any = ctx.$options.style || {}
  const result = {}
  classList.forEach(name => {
    const style = stylesheet[name]
    extend(result, style)
  })
  oldClassList.forEach(name => {
    const style = stylesheet[name]
    for (const key in style) {
      if (!result.hasOwnProperty(key)) {
        result[key] = ''
      }
    }
  })
  return result
}

export default {
  create: updateClass,
  update: updateClass
}
