// Converted from ShaderToy "Clouds FBM" -> Ikemen stage BG
// Original: cloudscale/speed/clouddark/cloudlight/cloudcover/cloudalpha/skytint + hash/noise/fbm

#if __VERSION__ >= 450
	#define COMPAT_TEXTURE texture
	layout(binding=1) uniform UniformBufferObject{
		vec4 x1x2x4x3; vec4 tint; vec3 add; vec3 mult; float alpha, gray, hue; int mask; bool isFlat, isRgba, isTrapez, neg;
		float iTime; vec2 iResolution; float aspectRatio;
	};
	layout(push_constant, std430) uniform u{
		vec4 palUV; float p0,p1,p2,p3,p4,p5,p6,p7; float p8,p9,p10,p11,p12,p13,p14,p15;
	};
	layout(binding=2) uniform sampler2D tex;
	layout(binding=3) uniform sampler2D pal;
	layout(location=0) in vec2 texcoord;
	layout(location=0) out vec4 FragColor;
#else
	#define COMPAT_VARYING in
	#define COMPAT_TEXTURE texture
	#ifdef GL_ES
		precision highp float; precision highp int;
	#endif
	out vec4 FragColor;
	uniform sampler2D tex; uniform sampler2D pal;
	uniform vec4 x1x2x4x3; uniform vec4 tint; uniform vec4 palUV; uniform vec3 add, mult;
	uniform float alpha, gray, hue; uniform int mask; uniform bool isFlat, isRgba, isTrapez, neg;
	uniform float p0,p1,p2,p3,p4,p5,p6,p7; uniform float p8,p9,p10,p11,p12,p13,p14,p15;
	uniform float iTime; uniform vec2 iResolution; uniform float aspectRatio;
	COMPAT_VARYING vec2 texcoord;
#endif

vec3 rgb2hsv(vec3 c){
	vec4 K=vec4(0.0,-1.0/3.0,2.0/3.0,-1.0);
	vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));
	vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));
	float d=q.x-min(q.w,q.y); float e=1.0e-10;
	return vec3(abs(q.z+(q.w-q.y)/(6.0*d+e)), d/(q.x+e), q.x);
}
vec3 hsv2rgb(vec3 c){
	vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);
	vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);
	return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);
}
vec3 hue_shift(vec3 color,float dhue){vec3 c=rgb2hsv(color); c.x=mod(c.x+dhue,1.0); return hsv2rgb(c);}
vec4 GetIkemenPixel(vec2 uv){
	vec4 c; vec3 neg_base=vec3(1.0); vec3 final_add=add; vec4 final_mul=vec4(mult,alpha);
	if(isFlat){c=tint; neg_base*=c.a; final_add*=c.a; final_mul.rgb*=alpha;}
	else{
		if(isTrapez){
			vec2 bounds=mix(x1x2x4x3.zw,x1x2x4x3.xy,uv.y);
			float gap=bounds[1]-bounds[0];
			#ifdef GL_ES
				if(abs(gap)<0.0001) gap=0.0001;
			#endif
			uv.x=(gl_FragCoord.x-bounds[0])/gap;
		}
		c=COMPAT_TEXTURE(tex,uv);
		if(isRgba){if(mask==-1)c.a=1.0; neg_base*=c.a; final_add*=c.a; final_mul.rgb*=alpha;}
		else{c=COMPAT_TEXTURE(pal,vec2(palUV[0]+palUV[2]*c.r*0.9966,palUV[1])); if(mask==-1)c.a=1.0;}
	}
	if(hue!=0.0)c.rgb=hue_shift(c.rgb,hue);
	if(neg)c.rgb=neg_base-c.rgb;
	c.rgb=mix(vec3((c.r+c.g+c.b)/3.0),c.rgb,1.0-gray);
	c.rgb+=final_add; c*=final_mul;
	if(!isFlat)c.rgb=mix(c.rgb,tint.rgb*c.a,tint.a);
	return c;
}
// ---------------------- shadertoy port ----------------------
const float cloudscale = 1.1;
const float speed = 0.03;
const float clouddark = 0.5;
const float cloudlight = 0.3;
const float cloudcover = 0.2;
const float cloudalpha = 8.0;
const float skytint = 0.5;
const vec3 skycolour1 = vec3(0.2, 0.4, 0.6);
const vec3 skycolour2 = vec3(0.4, 0.7, 1.0);
const mat2 ctM = mat2(1.6, 1.2, -1.2, 1.6);

// ponytail: renamed hash/noise to avoid builtin overload (planar_clouds.frag:64)
vec2 ctHash(vec2 p){
	p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
float ctNoise(in vec2 p){
	const float K1 = 0.366025404;
	const float K2 = 0.211324865;
	vec2 i = floor(p + (p.x+p.y)*K1);
	vec2 a = p - i + (i.x+i.y)*K2;
	vec2 o = (a.x>a.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
	vec2 b = a - o + K2;
	vec2 c = a - 1.0 + 2.0*K2;
	vec3 h = max(0.5-vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
	vec3 n = h*h*h*h*vec3(dot(a,ctHash(i+0.0)), dot(b,ctHash(i+o)), dot(c,ctHash(i+1.0)));
	return dot(n, vec3(70.0));
}
float fbm(vec2 n){
	float total = 0.0, amplitude = 0.1;
	for(int i=0; i<7; i++){
		total += ctNoise(n) * amplitude;
		n = ctM * n;
		amplitude *= 0.4;
	}
	return total;
}

void main(){
	// ponytail: 30 noise taps/pixel, lower loop counts if slow
	vec2 fragCoord = gl_FragCoord.xy;
	vec2 p = fragCoord.xy / iResolution.xy;
	vec2 uv = p*vec2(iResolution.x/iResolution.y,1.0);
	float speedVal = speed * ((p0!=0.0)?p0:1.0);
	float cs = (p1!=0.0)?p1:cloudscale;
	float ccov = (p2!=0.0)?p2:cloudcover;
	float calp = (p3!=0.0)?p3:cloudalpha;
	float time = iTime * speedVal;
	float q = fbm(uv * cs * 0.5);

	// ridged
	float r = 0.0;
	uv *= cs;
	uv.x += q - time;  // Only horizontal movement (x component)
	// uv.y unchanged for pure horizontal movement
	float weight = 0.8;
	for(int i=0; i<8; i++){
		r += abs(weight*ctNoise(uv));
		uv = ctM*uv + vec2(time, 0.0);  // Only add time to x component
		weight *= 0.7;
	}
	// shape
	float f = 0.0;
	uv = p*vec2(iResolution.x/iResolution.y,1.0);
	uv *= cs;
	uv.x += q - time;  // Only horizontal movement (x component)
	weight = 0.7;
	for(int i=0; i<8; i++){
		f += weight*ctNoise(uv);
		uv = ctM*uv + vec2(time, 0.0);  // Only add time to x component
		weight *= 0.6;
	}
	f *= r + f;

	// colour
	float c = 0.0;
	time = iTime * speedVal * 2.0;
	uv = p*vec2(iResolution.x/iResolution.y,1.0);
	uv *= cs*2.0;
	uv.x += q - time;  // Only horizontal movement (x component)
	weight = 0.4;
	for(int i=0; i<7; i++){
		c += weight*ctNoise(uv);
		uv = ctM*uv + vec2(time, 0.0);  // Only add time to x component
		weight *= 0.6;
	}
	float c1 = 0.0;
	time = iTime * speedVal * 3.0;
	uv = p*vec2(iResolution.x/iResolution.y,1.0);
	uv *= cs*3.0;
	uv.x += q - time;  // Only horizontal movement (x component)
	weight = 0.4;
	for(int i=0; i<7; i++){
		c1 += abs(weight*ctNoise(uv));
		uv = ctM*uv + vec2(time, 0.0);  // Only add time to x component
		weight *= 0.6;
	}
	c += c1;

	vec3 skycolour = mix(skycolour2, skycolour1, p.y);
	vec3 cloudcolour = vec3(1.1,1.1,0.9) * clamp((clouddark + cloudlight*c), 0.0, 1.0);
	f = ccov + calp*f*r;
	vec3 result = mix(skycolour, clamp(skytint * skycolour + cloudcolour, 0.0, 1.0), clamp(f + c, 0.0, 1.0));
	FragColor = vec4(result, 1.0);
}