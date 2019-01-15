vue-router个人觉得是只要是做vue开发，做单页应用个人认为是百分百要样的，但是vue-router的原理还是要分析一下，传统的路由思维是，通过hasChange这个事件，来控制dom视图的插入，hasChange后面的#后面的字符串表示对应的视图，通过解析这个字符串来匹配合适的视图，然后渲染到页面，同时具备hash模式和history模式，history模式需要设置一个callback表示，一旦刷新浏览器的时候，会重定向到一个指定页面，在了解vue-router的源码之前，这些都是铺垫思维，下面来看看真正的vue-router是如何实现的。还是从最简单的路由情况来一步一步去分析。根据管方最简单的案例。

<pre>When adding Vue Router to the mix, all we need to do is map our components to the routes and let 
Vue Router know where to render them. Here's a basic </pre>

先应管方的一句话，当需要添加Vue Router,所有我们需要做的就是把我们的组件映射到路由，然后让vue router知道在哪里去渲染它们。

    <div id="app">
      <h1>Hello App!</h1>
      <p>
	    <!-- use router-link component for navigation. -->
	    <!-- specify the link by passing the `to` prop. -->
	    <!-- <router-link> will be rendered as an `<a>` tag by default -->
	    <router-link to="/foo">Go to Foo</router-link>
	    <router-link to="/bar">Go to Bar</router-link>
      </p>
      <!-- route outlet -->
      <!-- component matched by the route will render here -->
      <router-view></router-view>
    </div>
    
    
    // 0. If using a module system, call Vue.use(VueRouter)
    
    // 1. Define route components.
    // These can be imported from other files
    const Foo = { template: '<div>foo</div>' }
    const Bar = { template: '<div>bar</div>' }
    
    // 2. Define some routes
    // Each route should map to a component. The "component" can
    // either be an actual component constructor created via
    // Vue.extend(), or just a component options object.
    // We'll talk about nested routes later.
    const routes = [
      { path: '/foo', component: Foo },
      { path: '/bar', component: Bar }
    ]
    
    // 3. Create the router instance and pass the `routes` option
    // You can pass in additional options here, but let's
    // keep it simple for now.
    const router = new VueRouter({
      routes
    })
    
    // 4. Create and mount the root instance.
    // Make sure to inject the router with the router option to make the
    // whole app router-aware.
    const app = new Vue({
      router
    }).$mount('#app')
    
    // Now the app has started!
官方示例给了4步，<br/>
0.如果使用模块系统,首先要使用Vue.use(VueRouter)<br/>
1.定义route components<br/>
2.定义route<br/>
3.创建router instance传入定义的routes<br/>
4.最后注入到根实例中。<br/>
下面以源码的角度从vue-router从安装注册到实例创建到注入来分析一下这一过程发生了什么<br/>
    
    Vue.use(VueRouter)
    VueRouter.install = install
上面这个过程执行VueRouter的静态方法,install下面来看看install做了什么