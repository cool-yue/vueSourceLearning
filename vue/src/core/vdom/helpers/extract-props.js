/* @flow */

import {
  tip,
  hasOwn,
  isDef,
  isUndef,
  hyphenate,
  formatComponentName
} from 'core/util/index'

// 这里的ctor表示子组件的options对象构建的构造函数
// 因此通过对比标签上compile之后的属性,跟options中的props中的属性进行对比
// 从而抽取props

export function extractPropsFromVNodeData (
  data: VNodeData,
  Ctor: Class<Component>,
  tag?: string
): ?Object {
  // we are only extracting raw values here.
  // validation and default values are handled in the child
  // component itself.
  const propOptions = Ctor.options.props
  if (isUndef(propOptions)) {
    return
  }
  const res = {}
  const { attrs, props } = data
  if (isDef(attrs) || isDef(props)) {
    for (const key in propOptions) {
      const altKey = hyphenate(key)
      if (process.env.NODE_ENV !== 'production') {
        const keyInLowerCase = key.toLowerCase()
        if (
          key !== keyInLowerCase &&
          attrs && hasOwn(attrs, keyInLowerCase)
        ) {
          tip(
            `Prop "${keyInLowerCase}" is passed to component ` +
            `${formatComponentName(tag || Ctor)}, but the declared prop name is` +
            ` "${key}". ` +
            `Note that HTML attributes are case-insensitive and camelCased ` +
            `props need to use their kebab-case equivalents when using in-DOM ` +
            `templates. You should probably use "${altKey}" instead of "${key}".`
          )
        }
      }
      checkProp(res, props, key, altKey, true) ||
      checkProp(res, attrs, key, altKey, false)
    }
  }
  return res
}

// 第五个字段表示是否保留,也就是如果检测到字段是否保留
// props是保留的
// attrs是不保留的
// 因为通过模板解析后,标签上面所有的属性都会并到attr:{}里面
// 而本身这种原生标签是没有自定义属性的比如<div abc="a"></div>这个abc对于div没有什么意义
// 而这种组件的props针对的自定义组件options中的props
// 换句话说就是options重定义了props,在组件上写props才有意义,比如<abc :aaa="xxx"></abc>
// 加上前期解析模板,把aaa也放入了attr:{}里面,因此实际上aaa是props的内容
// 因此这里要做一个抽取操作,抽取的逻辑就是在opition的props中跟attr:{}里面的对比
// 如果有一样的,就把attrs中与props中同名的,提取出来,并且删除attrs：{}中的该属性
// 针对于props的话,就保留，因为prop本来就属于props
// 这里面还做了个工作,就是把key转化成了肉串类型
// 因为props里面是javascript程序,虽然它区分大小写，驼峰，但是把它写在dom上面
// dom不区分大小写,因此 myName 和 myname虽然在js中是2个不同的变量
// 但是在dom上<div myName myname></div>最终的结果是只有一个myname
// 这样的话会产生不必要的误会和错误
// 因此写成串类型,例如props中是myName,对应的标签是<div my-name></div>
// 这样虽然解析成的vnode也是"my-name",但是这样约定就表示这个属性对应的props只能是myName
// 包括组件标签也是一样例如组件的选项name是myDiv,最后渲染出来的组件<my-div>
// vue的内部做了hyphenate的操作,对于props对比抽取,会进行2次,第一次没有hyphen的
// 第二次是hyphen的,这也是为什么写成肉串形式可以被识别
function checkProp (
  res: Object,
  hash: ?Object,
  key: string,
  altKey: string,
  preserve: boolean
): boolean {
  if (isDef(hash)) {
    if (hasOwn(hash, key)) {
      res[key] = hash[key]
      if (!preserve) {
        delete hash[key]
      }
      return true
    } else if (hasOwn(hash, altKey)) {
      res[key] = hash[altKey]
      if (!preserve) {
        delete hash[altKey]
      }
      return true
    }
  }
  return false
}
