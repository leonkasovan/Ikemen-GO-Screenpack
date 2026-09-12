//When converting to SPV, specify version 450
//#version 450 core

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
	// Specifying the name of the bgl_texture to be used for GrabPass processing will execute the process of creating a BackBuffer
	// Do not specify the name of the bgl_texture if you do not use a BackBuffer
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
	// Specifying the name of the bgl_texture to be used for GrabPass processing will execute the process of creating a BackBuffer
	// Do not specify the name of the bgl_texture if you do not use a BackBuffer
	
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

	// Select flat color or textures
	if (isFlat) {
		c = tint; 

		// Treat flat colors like RGBA for math consistency
		neg_base *= c.a;
		final_add *= c.a;
		final_mul.rgb *= alpha;
	} else {
		vec2 uv = texcoord;
		if (isTrapez) {
			vec2 bounds = mix(x1x2x4x3.zw, x1x2x4x3.xy, uv.y);
			float gap = bounds[1] - bounds[0];
			#ifdef GL_ES
				if (abs(gap) < 0.0001) gap = 0.0001;
			#endif
			uv.x = (gl_FragCoord.x - bounds[0]) / gap;
		}

		c = COMPAT_TEXTURE(tex, uv);

		// Select with or without palette
		if (isRgba) {
			if (mask == -1) c.a = 1.0;
			neg_base *= c.a;
			final_add *= c.a;
			final_mul.rgb *= alpha;
		} else {
			// Palette lookup — use palUV for atlas support
			c = COMPAT_TEXTURE(pal, vec2(palUV[0]+palUV[2]*c.r*0.9966, palUV[1]));
			if (mask == -1) c.a = 1.0;
		}
	}

	// Apply PalFX
	// Hue
	if (hue != 0.0) {
		c.rgb = hue_shift(c.rgb, hue);
	}
	// Invertall
	if (neg) {
		c.rgb = neg_base - c.rgb;
	}
	// Color
	c.rgb = mix(vec3((c.r + c.g + c.b) / 3.0), c.rgb, 1.0 - gray);
	// Add
	c.rgb += final_add;
	// Mul
	c *= final_mul;

	// Apply tint
	// Sprites only, because flat colors are already tinted
	if (!isFlat) {
		c.rgb = mix(c.rgb, tint.rgb * c.a, tint.a);
	}
	return c;
}
// ----------------------

vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;
    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;
    vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
    vec3 n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
    return dot(n, vec3(70.0));
}

float fbm(vec2 uv) {
    float f = 0.0;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    f += 0.5000 * noise(uv); uv = m * uv;
    f += 0.2500 * noise(uv); uv = m * uv;
    f += 0.1250 * noise(uv); uv = m * uv;
    f += 0.0625 * noise(uv);
    return 0.5 + 0.5 * f;
}
// ----------------------

void main() {
    vec2 uv = texcoord;

    float progress     = (iTime-p0);
    float particleScale= p1 != 0.0 ? p1 : 40.0;
    float glowStrength = p2 != 0.0 ? p2 : 4.0;
    vec3 sparkColor    = (p3 != 0.0 || p4 != 0.0 || p5 != 0.0) ? vec3(p3, p4, p5) : vec3(1.0, 0.4, 0.05);

    // If the progress is 1.0 or higher, it will be completely hidden
    if (progress >= 1.0) {
        FragColor = vec4(0.0);
        return;
    }

    float dissolveNoise = fbm(uv * 4.0);

    vec2 flowUV = uv;
    flowUV.y += iTime * 0.4;
    flowUV.x += sin(iTime * 0.5) * 0.05; // 少し横に揺らす
    
    float pNoise = fbm(flowUV * particleScale);
    pNoise *= fbm(flowUV * particleScale * 1.5);
    pNoise = pow(pNoise, 3.0) * 8.0;

    float threshold = progress * 1.4 - 0.2;

    float mask = smoothstep(threshold, threshold + 0.05, dissolveNoise);

    float edgeRegion = smoothstep(threshold - 0.05, threshold + 0.1, dissolveNoise) 
                     - smoothstep(threshold + 0.1, threshold + 0.25, dissolveNoise);
    vec3 edgeGlow = sparkColor * edgeRegion * glowStrength * 0.8;

    vec2 sparkSampleUV = uv + vec2(0.0, progress * 0.1); 
    vec4 sparkBase = GetIkemenPixel(sparkSampleUV);

    float sparkRegion = smoothstep(threshold - 0.25, threshold + 0.05, dissolveNoise) 
                      - smoothstep(threshold + 0.05, threshold + 0.15, dissolveNoise);

    float sparkIntensity = clamp(pNoise * sparkRegion, 0.0, 1.0);
    
    vec3 particleGlow = sparkColor * sparkIntensity * glowStrength * 2.0;
    particleGlow += vec3(1.0) * pow(sparkIntensity, 2.5) * glowStrength;

    //Color Synthesis
    vec4 baseColor = GetIkemenPixel(uv);

    vec4 finalColor = baseColor * mask;

    float combinedAlpha = max(baseColor.a * mask, sparkBase.a * sparkIntensity);
    
    finalColor.rgb += (edgeGlow * baseColor.a) + (particleGlow * sparkBase.a);

    finalColor.a = clamp(combinedAlpha * (1.0 - progress * 0.3), 0.0, 1.0);

    FragColor = finalColor * alpha;
}