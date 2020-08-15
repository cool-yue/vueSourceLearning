vuex作为vue的数据管理插件，在体量较为大的应用中能够清晰地修改各个视图中共享的一些state，下面把vue官方对于vuex的看法贴在这里：<br/>

<pre>
为什么要用VUEX?
首先如果应用简单当然就没必要，比如一个应用一个组件，一件组件里面一套数据
加上一套修改数据的方法。这样当然没有问题。

然而，当这种简单的结构被打破的时候，比如，当有多个组件共享一个常规的状态时候。会有 
2个问题。

1.多个视图可能都依赖于同一块状态。（data里面的字段）
2.不同视同中的Actions可能需要改变同一块状态。（data里面的字段）
上述两个情况之所以复杂，是因为，如果共享状态，我们知道每个组件都有自己的
data（），假设能够确定有10个组件共享2个属性，那么当某个组件更新状态的时候，其余的9 
个组件都需要在自己的data里头去修改成一样的状态。（考虑到组件的作用域只有它自己本身 
的那一块，所以每个组件都要去自己去修改），这样就麻烦了，假如有100个呢？1000个呢？
下面来说说解决方案？
对于问题1.针对父子组件可以通过传送props属性来进行相应的更新，然后这种操作方式依旧 
很恶心，因为我必须要事先就确定哪里props是共享状态的，然而这还是没有根本解决问题， 
兄弟组件之间就没办法通过props来传递了。
对于问题2.我们可以经常发现，我们解决这个问题，通过直接获取父组件或者子组件的引用， 
或者通过事件（event）来修改和同步多个状态的拷贝，这样的操作方式最后会导致代码不可 
以维护。

通过以上的分析，为何我们不把组件共享的状态从组件中抽离出来，并且处理它
通过一个全局单例？使用这种方式，我们的组件树变成了一个大view，而不是多
个view，并且任何一组件都能够访问这个状态和触发actions，不论这个组件位于
树中的哪个部位。

除此之外，通过在状态管理中使用到定义和隔离的概念，我们可以给我们的代码更
具结构感和可维护性。

这就是VueX产生的背后的想法，取经于Flux,Redux和the elm architecture。不像其他
模式，vueX也是一个库的实现为Vue.js量身定制，针对高效更新利用他的细粒度响应系统。


那现在的问题是，我们什么时候使用它呢？
尽管Vuex帮助我们处理共享状态管理，同时它也会带来相应的概念和模板公式化的开销。
这是一个短期和长期产品化的一个权衡。

如果你从来没有构建一个大型的单页应用，同时正好又跳入到Vuex的使用，这可能让你
感觉到非常冗余和令人畏惧。这很正常，如果你的app是简单的，你最有可能不会用到VueX
一个简单的store pattern就是所有你需要的。如果你正在构建一个中到大型的SPA，在你的
Vue组件外头如何更好的控制状态你有很多机会碰到这个问题，那么VueX就是自然而然为你所
选的下一步方针。Dan Abramov说过，Redux的作者，Flux就像眼镜一样，在你需要它们的时候
你会知道的。

VueX的使用
每一个Vuex应用的中心是store。一个 store就是一个控制application state的一个容器。通俗来说它就是一个对象，但是它跟plain global object的不同在于2点。
1.	Vuex stores是响应式的。当Vue的实例从store里头拿数据的时候，如果里头的数据改变了，实例里头的数据也会响应的，高效地更新。
2.	第二个就是约定俗成的东西，就是你不能够直接改变store里头的状态。唯一改变store状态的是通过严格地committing mutations。这么麻烦的形式去做，就是为了保证每一次修改状态都能有迹可循，能够促使工具帮助我们更好地理解我们的app。应用小看不出来，但是一旦应用有一定的体积，按照这种约定俗成的套路来，可以很好地管理和维护app。
在vuex中获取到vuex state
最简单地获取vuex state是通过计算属性返回
</pre>
前面这些是看的vuex的英文版翻译过来的，下面通过最最简单的vuex实例入门，通过源码来分析。在new Vue之前，需要先安装Vuex，安装步骤就一句话。
    
    import Vue
    import Vuex
    Vue.use（Vuex）；

一句话Vue.use(Vuex)就能安装了Vuex的插件，它底层实际上就是在Vue的options中并入了{beforeCreate:fn}，这个fn在每一个实例初始化的时候会运行，它的逻辑就是如果vm.$options中存在store,那么给this.$store，如果不存在那么表示它是子组件，那么就去找parent的store，然后赋值给$store。为什么$parent可能会有store,因为如果要使用store的话，要初始化store对象，并且并入到根组件的options中，下面一点点来看。

    function install (_Vue) {
      // 如果Vue存在
      if (Vue) {
	    console.error(
	      '[vuex] already installed. Vue.use(Vuex) should be called only once.'
	    )
        return
      }
      // 把_Vue赋值给Vue
      Vue = _Vue
      // 开始混入
      applyMixin(Vue)
    }
Vue.use实际上执行传入的函数或者传入的对象上面的install函数，并且给一个参数赋值为Vue。因此整个Vuex使用就是applyMixin(Vue)这个方法。

     Vue.mixin({ beforeCreate: vuexInit })
     function vuexInit () {
	    // 拿到当前实例的$options
	    const options = this.$options
	    // store injection
	    // 如果有store这个键
	    // 就把this.$store = options.store
	    // 如果没有,options.parent里面去找,如果找到了
	    // this.$store = options.parent.$store
	    // 相当于找父组件里面的$store
	    // 在组件beforeCreate的时候都会进行这些初始化操作
	    if (options.store) {
	      this.$store = options.store
	    } else if (options.parent && options.parent.$store) {
	      this.$store = options.parent.$store
	    }
	  
    }
如上，就是applyMixin的实现方式，就是在Vue的options中混入一个beforeCreate的钩子,这个钩子会初始化当前实例的$store属性,这个$sotre属性指向根组件传入的options中的store属性，所以store只有一个，他就是传入根组件的options的store。下面来看看最基本的store，连getters都不要的，以官方实例作为线索，来分析vuex的脉络。

    // 模板
    <div id="app">
      <p>{{ count }}</p>
      <p>
        <button @click="increment">+</button>
      </p>
    </div>
    
    // 对应的js
    const store = new Vuex.Store({
      state: {
    	count: 0
      },
      mutations: {
     	increment (state) {
      		state.count++
    	}
    }
    })
  
    new Vue({
      el: '#app',
      computed: {
      	count () {
    		return store.state.count
      	}
      },
      methods: {
    	increment () {
      		store.commit('increment')
    	}
      }
    })

如上面的代码，在store中存入了状态state:{count: 0},然后定义了一个mutations,里面有修改state的方法，这个示例的过程就是点击+按钮，然后触发`store.commit('increment')`,然后在store中运行increment，然后state.count++操作，然后视图中的count会加1，然后显示。这上面需要分析的有2个部分，一个是new Vuex.store做了什么，然后commit做了什么。
    // 首先store接收一个options
    Class store {constructor(options) {}}
     
    // 以下是constructor中的有效有内容（针对上面的示例）
    // state = { count:0 }
    let { state = {} } = options；
     
    // 下面全是空对象
    this._committing = false
    this._actions = Object.create(null)
    this._mutations = Object.create(null)
    this._wrappedGetters = Object.create(null)
    // 这里
    this._modules = new ModuleCollection(options)
    this._modulesNamespaceMap = Object.create(null)
    this._subscribers = []

    this._watcherVM = new Vue()  
    const store = this
    const { dispatch, commit } = this
    // 绑定commit函数的上下文为store
    this.commit = function boundCommit (type, payload, options) {
      return commit.call(store, type, payload, options)
    }
    
    this.strict = strict
    installModule(this, state, [], this._modules.root)；
    // 为state创建一个vue示例，其中state为data选项中的数据
    resetStoreVM(this, state)
这里需要分析的是ModuleCollection，commit，installModule，resetStoreVM做什么。ModuleCollection如下：

    this._modules = new ModuleCollection(options)
    // ModuleCollection的构造函数中new了一个Module
    this.root = new Module(options, false) 
    // Module的构造函数如下
	constructor (rawModule, runtime) {
	    this.runtime = runtime
	    this._children = Object.create(null)
	    this._rawModule = rawModule
	    const rawState = rawModule.state
	    this.state = (typeof rawState === 'function' ? rawState() : rawState) || {}
      }

上面代码就是把options保存在了一个root对象中，也就是`this._modules.root,options`为rawModule属性，state为options中的state。<br/>
我们这里用到的有2个，一个是`this._modules.root.state` = `{count:0}`,`this._modules.root._rawModule` = `{state:xxx,mutations:xxxx}`
    
commit的代码如下：

    commit (_type, _payload, _options) {
	    const { type,payload,options } = unifyObjectStyle(_type, _payload, _options)
	       const mutation = { type, payload }
	       const entry = this._mutations[type]
	       this._withCommit(() => {
	       		entry.forEach(function commitIterator (handler) {
	    			handler(payload)
	      	})
	    })
    }
intallModule为初始化store的一些选项，这里示例只传入了mutations，因此只分析mutations，下面来分析一下：

     // 传了了4个参数，store,state,空数组 和root对象
     installModule(this, state, [], this._modules.root)
     module = this._modules.root
     module.forEachMutation((mutation, key) => {
    	const namespacedType = namespace + key
    	registerMutation(store, namespacedType, mutation, local)
      })

    // forEachMutation的定义
    forEachMutation (fn) {
    	if (this._rawModule.mutations) {
      		forEachValue(this._rawModule.mutations, fn)
    	}
  	}
    // forEachValue的定义
    function forEachValue (obj, fn) {
      Object.keys(obj).forEach(key => fn(obj[key], key))
    }
上面的代码相当于把遍历mutations属性中的每个键和值，然后把值和键（这里不考虑命名空间）作为参数传入到registerMutation(store, key, mutation, local)，下面看看registerMutation做了什么。

    function registerMutation (store, type, handler, local) {
      const entry = store._mutations[type] || (store._mutations[type] = [])
      entry.push(function wrappedMutationHandler (payload) {
    	handler(local.state, payload)
      })
    }
第一个参数是store对象，第二个参数是mutations的key，第三个参数是mutations的值（如上面的increment），第四个参数这里不管，上面做的事情就是把，store初始化的`_mutations`属性存入options中的mutations属性，不同点在于`_mutations`中的值为一个数组，并把对应的方法体，push进去，比如`increment() function() {}`,变成了`store._mutations:{incrment:[fn]}`,并且把handler的第一个参数传入state，第二个传入用户给的payload。所这样commit的逻辑就非常清晰了。

commit(type)就是在store中拿到`_mutations[type]`,通常这是一个函数或者是个函数数组，每次调用的时候给定一个字段叫isCommitting。下面看看resetStoreVM(this, state)做了什么。

    function resetStoreVM (store, state, hot) { 
	    const oldVm = store._vm
	    store.getters = {}
	    const computed = {}
	    store._vm = new Vue({
	    	data: {
	      		$$state: state// 这里具备响应式
	    	},
	    	computed
	     })	    
    }
如上面代码，将state对象作为data来变成一个Vue实例，所以state里面的所有变量都被defineReactive了，然后把这个对象给store._vm保存，resetStoreVm完毕。说到这里，初始化完成，下面来看看响应式的过程。
## store实现响应的过程 ##
首先store里面的state被用来初始化了一个vm实例，这个state里面的所有的值都具备响应式。在上面的例子中，定义了一个计算属性，该属性依赖于这个state。

     computed: {
      	count () {
    		return store.state.count
      	}
     }
在初始化computed的时候，见computed专门的文档，可以知道count也有一个自己的watcher，这个wathcer收集了store.state.count作为依赖，在视图渲染的过程中，取到这个count值的时候，count属性的wathcer收集了state.count依赖，读取完这个属性后，切换到了视图watcher，视图watcher也去收集了state.count依赖。然后视图初始化完成，随后，当点击+按钮的时候，运行了下面的代码：

    increment () {
      		store.commit('increment')
    	}
上面这句话执行了store的commit方法，从上面的分析可以知道，commit方法会去拿到store._mutations对应的increment属性，然后遍历执行里面所有的函数，在执行过程中将isCommitting设置为true，increment的操作下面：
    
      mutations: {
     	increment (state) {
      		state.count++
    	}
    }

其中state为options中传入的state，然后将state.count进行++操作，触发了store._vm中data的set方法，于是set会notify watcher，这个示例中，count属性的subs中存有，computedWatcher和视图Watcher,他们都会执行update方法，对于computedWatcher，设置this.dirty = true,然后视图Watcher会更新视图，产生vnode，产生vnode的过程中触发了computed的get函数，由于dirty是true，所以会再次运行计算属性get，拿到修改后的值，然后渲染进vnode，最后通过vnode和老的vnode进行对比，通过diff来更新dom，于是视图中的属性修改完毕，vuex的过程也完毕，这里绑定了一个属性，当多个组件依赖这个时候，由于本质上count收集了这些watcher因此能够触发每个依赖count的dom的更新。这里是最简单的应用，后续会分析，带有getters，带有actions带有module的情况。
## 未完待续 ##