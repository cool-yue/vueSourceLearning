## extend ##
extend是vue中非常重要的一个全局方法，所有的vue-component全部通过它来构建构造函数，并且也会通过它来存入对应的options，并且还会父元素的mergeOptions，视图的最终渲染，是一个树形结构，父子之间有着千丝万缕的关系，下面来分析一下涉及到constructor的一些东西，vue的源码通常称为ctor。<br/>
## extend（）方法 ##
Vue.extend作为全局api基本上是创建一个特定组件的构造器，下面来看看具体过程。
在初始化的时候每个构造器都有个id，其中给Vue这个最原始的构造器cid为0，然后设置一个局部变量cid=1产生一个闭包，来随着构造器的产生来进行自增。

      Vue.cid = 0
      let cid = 1
extend都会放入组件的一个options对象，这个options是用户定义的，称为extendOptions，在调用extend的时候，拿到这个选项，如果没有就给一个空对象，所有的组件都是通过Vue.extend来构造，设定一个局部变量Super把Super的值给Vue，SuperId设置为Super.cid,然后取得extendOptions._Ctor，如果没有就给一个新的对象，同时赋值给一个局部变量cachedCtors，当还没有使用过extend的时候，这个属性肯定没有，可以认为这个属性就是缓存构造器的，然后找cacheCtors中有没有SuperId，如果有就直接返回，第一次执行，当然这里是没有的，因为SuperId在初始化的时候是Vue，Vue不需要放入这个里面，它是个全局变量，然后继续往下走，取到extendOptions的name，没有的话就去Super里面的name，注意Vue的options.name为undefined，如果存在name并且在开发模式就检测一下name是否合法，走到这里前期准备已经完成。

    // 没有传入就设为空对象
    extendOptions = extendOptions || {}
    // 把this赋值给super,this此时是Vue
    const Super = this
    // 取到Vue.cid,显然superId = 0
    const SuperId = Super.cid
    // extendOptions有没有_Ctor属性,没有就就初始化一个对象,然后赋值给cachedCtors
    // 正常情况下基本是不会往extend里面放一个_Ctor属性
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    // cachedCtors里面有没有superId,有就返回,没有继续往下走
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }
    // extendOptions有没有name,没有就取Super.options.name
    const name = extendOptions.name || Super.options.name
    // 看是不是生产环境,如果是,默认情况是生产环境不需要下面这些验证
    // 下面这些问题,应该是在开发阶段就应该解决
    if (process.env.NODE_ENV !== 'production') {
      // 测试name是不是字母开头,中间包含-或者字母,如果不是就报警告
      if (!/^[a-zA-Z][\w-]*$/.test(name)) {
        warn(
          'Invalid component name: "' + name + '". Component names ' +
          'can only contain alphanumeric characters and the hyphen, ' +
          'and must start with a letter.'
        )
      }
    }

前期工作做完了之后，这里开始定义真正的构造器了，实际上它一个叫Sub的函数，函数是一个具名函数，叫VueComponent，它也会接受一个options参数，然后执行Vue._init();Vue.init()这个后面再说，现在先把Sub的定义走完。

    // 这里定义了一个function,调用了this._init(options)，跟实例化Vue走了一样的过程
    const Sub = function VueComponent (options) {
      this._init(options)
    }
然后再初始化Sub函数的一些属性，首先穿件一个Sub的prototype，它是一个对象，它的实例的__proto__指向了Super.prototype,也就是sub.prototype是一个对象，它的原型指向Super.prototype.然后在Sub.prototype的上面设置一个constructor，让它的值等于Sub，典型的创建一个自定义的构造函数方式。设置Sub的cid，Sub的cid从1开始，Vue是0，然后赋值之后cid++，现在来设置Sub.options,它的值是Super.options和extendOptions的合并结果，使用了mergeOptions，然后设置一个super属性指向super，这几个设置的代码如下：

    // 首先把Sub的prototype设置为一个指向Super.prototype的对象
    // 这里Super是Vue
    Sub.prototype = Object.create(Super.prototype)
    // 在prototype中的.constructor设置为Sub,这个属于正常初始化prototype流程
    Sub.prototype.constructor = Sub
    // Sub.cid = cid++,这里实际上为Sub.cid赋值为1
    // 赋值完后cid变成了2
    Sub.cid = cid++
    // Sub.options设置为Vue.options和extendOptions的合并，详细见mergeOptions
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    // Sub.super = Super,这里设置为Vue
    Sub['super'] = Super

下面看看mergeOptions做了什么：
mergeOptions顾名思义就是将子组件的options和父组件（Vue）的options进行合并。合并的意义在于,Vue是一个全局函数，它的options有些时候需要被后代组件进行共享，这是因为全局会注册一些有用的api，比如一个组件里面写了<keep-alive></keep-alive>它之所以能用的原因在于keep-alive这个组件实际上是Vue全局注册的，并且