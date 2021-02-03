const componentA = {
    template: "<div>compoA</div>",
    beforeUpdate() {
        console.log("componentA beforeUpdate");
    }
};



const app = new Vue({
    el:"#app",
    template:"<div>asedasdasd<component-a /></div>",
    components: {
        componentA
    },
    beforeUpdate() {
        console.log("root beforeUpdate");
    }
});

app.$mount(document.getElementById("app"));