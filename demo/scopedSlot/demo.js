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


app1 = new Vue({
	template:"<div><h2>i am root</h2><abc></abc><div>{{info}}</div></div>",
	data(){
		return {
			info:"root footer!"
		}
	}
});

app1.$mount(document.getElementById("app"));