import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' 
import GUI from 'lil-gui'
import gsap from 'gsap'
import fragmentShader from './shaders/fragment.glsl'
import vertexShader from './shaders/vertex.glsl'
 
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass'


import front from './front.png'
import back from './back.png'



export default class Sketch {
	constructor(options) {
		
		this.scene = new THREE.Scene()
		
		this.container = options.dom
		
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		
		
		// // for renderer { antialias: true }
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
		this.renderer.setSize(this.width ,this.height )
		this.renderer.setClearColor(0xeeeeee, 1)
		this.renderer.useLegacyLights = true
		this.renderer.outputEncoding = THREE.sRGBEncoding
 

		 
		this.renderer.setSize( window.innerWidth, window.innerHeight )

		this.container.appendChild(this.renderer.domElement)
 


		this.camera = new THREE.PerspectiveCamera( 70,
			 this.width / this.height,
			 0.01,
			 10
		)
 
		this.camera.position.set(0, 0, 2) 
		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.time = 0


		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
		this.gltf = new GLTFLoader()
		this.gltf.setDRACOLoader(this.dracoLoader)

		this.isPlaying = true

		this.addObjects()		 
		this.resize()
		this.render()
		this.setupResize()
		this.addLights()

 
	}

	settings() {
		let that = this
		this.settings = {
			progress: 0
		}
		this.gui = new GUI()
		this.gui.add(this.settings, 'progress', 0, 1, 0.01)
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize() {
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		this.renderer.setSize(this.width, this.height)
		this.camera.aspect = this.width / this.height


		// this.imageAspect = 853/1280
		// let a1, a2
		// if(this.height / this.width > this.imageAspect) {
		// 	a1 = (this.width / this.height) * this.imageAspect
		// 	a2 = 1
		// } else {
		// 	a1 = 1
		// 	a2 = (this.height / this.width) / this.imageAspect
		// } 


		// this.material.uniforms.resolution.value.x = this.width
		// this.material.uniforms.resolution.value.y = this.height
		// this.material.uniforms.resolution.value.z = a1
		// this.material.uniforms.resolution.value.w = a2

		this.camera.updateProjectionMatrix()



	}


	addObjects() {

		
		let frontTexture = new THREE.TextureLoader().load(front)
		let backTexture = new THREE.TextureLoader().load(back)

		let arr = [frontTexture, backTexture]

		// console.log(frontTexture, backTexture);

		arr.forEach(t => {
			t.wrapS = 1000,
			t.wrapT = 1000,
			t.repeat.set(1,1)
			t.offset.setX(0.5)
			t.flipY = false
		})

		//frontTexture.repeat.set(-1, 1)
 
		backTexture.repeat.set(-1, 1)
 



		let frontMaterial = new THREE.MeshStandardMaterial({
			map: frontTexture,
			side: THREE.BackSide,
			roughness: 0.65,
			metalness: 0.25,
			alphaTest: true
		})

		let backMaterial = new THREE.MeshStandardMaterial({
			map: backTexture,
			side: THREE.FrontSide,
			roughness: 0.65,
			metalness: 0.25,
			alphaTest: true
		})


		

		
		this.geometry = new THREE.SphereGeometry(1,30, 30)
		this.plane = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: true}))
 
		// this.scene.add(this.plane)


		let num = 7

		let curvePoints = []

		for (let i = 0; i < num; i++) {

			let thelta = i / num * Math.PI * 2

			curvePoints.push(
				new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 + (Math.random() - 0.5) , thelta)
			)

		}

		const curve = new THREE.CatmullRomCurve3(curvePoints)

		curve.tension = .7

		curve.closed = true

		const points = curve.getPoints(50)

		const geometry = new THREE.BufferGeometry().setFromPoints(points)
		const material = new THREE.LineBasicMaterial({color: 0xff0000})
		const curveObject = new THREE.Line(geometry, material)

		this.scene.add(curveObject)

		let number = 1000
 
		let frenetFrames = curve.computeFrenetFrames(number, true)
		let spacedPoints = curve.getSpacedPoints(number)
		let tempPlane = new THREE.PlaneGeometry(1,1,number, 1)
		let dimensions = [-.1, 0.1]


		this.materials = [frontMaterial, backMaterial]

		tempPlane.addGroup(0,6000,0)
		tempPlane.addGroup(0,6000,1)



		let point = new THREE.Vector3()
		let binormalShift = new THREE.Vector3()
		let temp2 = new THREE.Vector3()

		let finalPoints = []

		dimensions.forEach(d => {
			for (let i = 0; i <= number; i++) {
				point = spacedPoints[i]
				binormalShift.add(frenetFrames.binormals[i]).multiplyScalar(d)
				
				finalPoints.push(new THREE.Vector3().copy(point).add(binormalShift))
			}
		})


		let finalMesh = new THREE.Mesh(tempPlane,this.materials)



		finalPoints[0].copy(finalPoints[number])
		finalPoints[number + 1].copy(finalPoints[2 * number + 1])


		// finalPoints[number + 1].copy()


		tempPlane.setFromPoints(finalPoints)

		this.scene.add(finalMesh)





	}



	addLights() {
		const light1 = new THREE.AmbientLight(0xeeeeee, 0.5)
		this.scene.add(light1)
	
	
		const light2 = new THREE.DirectionalLight(0xeeeeee, 0.5)
		light2.position.set(0.5,0,0.866)
		this.scene.add(light2)
	}

	stop() {
		this.isPlaying = false
	}

	play() {
		if(!this.isPlaying) {
			this.isPlaying = true
			this.render()
		}
	}

	render() {
		if(!this.isPlaying) return
		this.time += 0.001
		// this.material.uniforms.time.value = this.time
		 
		//this.renderer.setRenderTarget(this.renderTarget)
		this.renderer.render(this.scene, this.camera)

		this.materials.forEach((m, i) => {
			m.map.offset.setX(this.time)

			if(i > 0) {
				m.map.offset.setX(-this.time)
			
			}
		})

		//this.renderer.setRenderTarget(null)
 
		requestAnimationFrame(this.render.bind(this))
	}
 
}
new Sketch({
	dom: document.getElementById('container')
})
 