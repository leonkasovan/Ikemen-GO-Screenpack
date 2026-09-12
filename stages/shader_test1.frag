// Converted from ShaderToy golfed https://www.shadertoy.com/view/mtyGWy (533->227 chars) → Ikemen frag format

#if __VERSION__ >= 450
	// VULKAN PATH
	#define COMPAT_TEXTURE texture
	layout(binding = 1) uniform UniformBufferObject  {
		vec4 x1x2x4x3;
		vec4 tint;
		vec3 add;
		vec3 mult;
		float alpha, gray, hue;
		int mask;
		bool isFlat, isRgba, isTrapez, neg;
		float iTime;
		vec2 iResolution;
		float aspectRatio;
	};
	layout(push_constant, std430) uniform u {
		vec4 palUV;
		float p0, p1, p2, p3, p4, p5, p6, p7;
		float p8, p9, p10, p11, p12, p13, p14, p15;
	};
	layout(binding = 2) uniform sampler2D tex;
	layout(binding = 3) uniform sampler2D pal;
	layout(location = 0) in vec2 texcoord;
	layout(location = 0) out vec4 FragColor;
#else
	// OPENGL / GLES PATH
	#define COMPAT_VARYING in
	#define COMPAT_TEXTURE texture
	#ifdef GL_ES
		precision highp float;
		precision highp int;
	#endif
	out vec4 FragColor;
	
	uniform sampler2D tex;
	uniform sampler2D pal;
	
	uniform vec4 x1x2x4x3;
	uniform vec4 tint;
	uniform vec4 palUV;
	uniform vec3 add, mult;
	uniform float alpha, gray, hue;
	uniform int mask;
	uniform bool isFlat, isRgba, isTrapez, neg;

	uniform float p0, p1, p2, p3, p4, p5, p6, p7;
	uniform float p8, p9, p10, p11, p12, p13, p14, p15;

	uniform float iTime;
	uniform vec2 iResolution;
	uniform float aspectRatio;
	COMPAT_VARYING vec2 texcoord;
#endif

vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 hue_shift(vec3 color, float dhue) {
	vec3 colorhsv = rgb2hsv(color);
	colorhsv.x = mod(colorhsv.x+dhue, 1.0);
	return hsv2rgb(colorhsv);
}

vec4 GetIkemenPixel(vec2 uv) {
	vec4 c;
	vec3 neg_base = vec3(1.0);
	vec3 final_add = add;
	vec4 final_mul = vec4(mult, alpha);
	if (isFlat) {
		c = tint; 
		neg_base *= c.a;
		final_add *= c.a;
		final_mul.rgb *= alpha;
	} else {
		if (isTrapez) {
			vec2 bounds = mix(x1x2x4x3.zw, x1x2x4x3.xy, uv.y);
			float gap = bounds[1] - bounds[0];
			#ifdef GL_ES
				if (abs(gap) < 0.0001) gap = 0.0001;
			#endif
			uv.x = (gl_FragCoord.x - bounds[0]) / gap;
		}
		c = COMPAT_TEXTURE(tex, uv);
		if (isRgba) {
			if (mask == -1) c.a = 1.0;
			neg_base *= c.a;
			final_add *= c.a;
			final_mul.rgb *= alpha;
		} else {
			c = COMPAT_TEXTURE(pal, vec2(palUV[0]+palUV[2]*c.r*0.9966, palUV[1]));
			if (mask == -1) c.a = 1.0;
		}
	}
	if (hue != 0.0) c.rgb = hue_shift(c.rgb, hue);
	if (neg) c.rgb = neg_base - c.rgb;
	c.rgb = mix(vec3((c.r + c.g + c.b) / 3.0), c.rgb, 1.0 - gray);
	c.rgb += final_add;
	c *= final_mul;
	if (!isFlat) c.rgb = mix(c.rgb, tint.rgb * c.a, tint.a);
	return c;
}
// ----------------------

void main() {
    vec2 R = iResolution.xy;
    vec2 F = gl_FragCoord.xy;
    vec2 u = (F + F - R) / R.y;          // (F+F-R)/R.y
    float l = length(u);
    vec4 O = vec4(0.0);

    // i = 1..4 to match original post-increment semantics (O*=i zeroes O on first iter)
    for (float i = 1.0; i <= 4.0; i += 1.0) {
        // u = fract(u*1.5)-.5 evaluated each iteration
        u = fract(u * 1.5) - 0.5;
        float lenU = length(u);

        // pow(.04 / abs(sin(8.*(lenU/exp(l))+iTime)), 1.2) * (1.+cos(6.*(l+(i+iTime)*.4+vec4(.26,.4,.56,0))))
        float s = sin(8.0 * (lenU / exp(l)) + iTime);
        float glow = pow(0.04 / abs(s), 1.2);

        vec4 col = (1.0 + cos(6.0 * (l + (i + iTime) * 0.4 + vec4(0.26, 0.4, 0.56, 0.0))));
        O += glow * col;
    }

    FragColor = vec4(O.rgb, 1.0);
}
