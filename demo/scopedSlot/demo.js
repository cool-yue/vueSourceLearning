// Vue.component("myDiv",{
// 	template:"<div><slot>我是默认的</slot></div>",
// 	mounted() {
// 		console.log("myDiv this.$slots",this.$slots);
// 		console.log("myDiv",this.$options);
// 	}
// });

// Vue.component("child",{
// 	template:`<div class="child">
//                <h3>这里是子组件</h3>
//                <slot :data="data"></slot>
//              </div>`,
//     data() {
// 		return {
// 	       data: ['zhangsan','lisi','wanwu','zhaoliu','tianqi','xiaoba'],
// 		}
// 	},
// 	beforeCreate() {
// 		console.log(this.data);
// 	},
// 	mounted() {
// 		console.log(this.data);
// 	}
// });

// Vue.component("myLi",{
// 	template:`<li class="dx-li">	
//                 <slot str="你好 掘金！">
// 	                hello juejin!
//                 </slot>
//             </li>`,
//     data() {
// 		return {
// 	        todos:[
// 			    {id:1,a:true,text:"one"},
// 				{id:2,a:false,text:"one"},
// 			    {id:3,a:true,text:"one"},
// 			]
// 		}
// 	},
// 	beforeCreate() {
// 		console.log(this.todos);
// 	},
// 	mounted() {
// 		console.log(this.todos);
// 	}
// })

/*
const app = new Vue({
    el:"#app",
    template: `<ul>
               <my-li>
                 <span slot-scope="scope">
                      {{scope.str}}
                 </span>
               </my-li>
             </ul>`,
	data() {
		return {
		}
	}
});
*/

Vue.component("abc",{
	template:"<div>我是{{mes}}</div>",
	data() {
		return {
			mes:"abc"
		}
	}
})

// with(this){return _l((items),function(key){return _c('div',[_c('h2',[_v(_s(key))]),_c('abc'),_c('div',[_v(_s(info))]),(show)?_c('div',[_v("show")]):_e()],1)})}

app1 = new Vue({
	template:"<div><h2>{{key}}</h2><abc></abc><div>{{info}}</div><div v-if='show'>show</div></div>",
	data(){
		return {
			info:"root footer!",
	        items:["1","2","3"],
			show:true
		}
	}
});

app1.$mount(document.getElementById("app"));