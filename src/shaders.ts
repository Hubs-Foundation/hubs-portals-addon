export const portalVertexShader = `
varying vec2 vUv;
void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vUv = uv;
    // vUv.x = 1.0 - vUv.x;
}
`;

export const portalFragmentShader = `
varying vec2 vUv;

uniform sampler2D iChannel0;
uniform vec3 iResolution;
uniform vec3 iPortalColor;
uniform float iTime;
 
#include <common>

vec3 greyscale(vec3 color, float str) {
    float g = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(color, vec3(g), str);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float t = iTime;
    // Normalized pixel coordinates (from -1 to 1)
    vec2 uv = 2.0*(fragCoord-.5*iResolution.xy)/iResolution.xy;
    uv.y *= 0.65;

    // polar
    float d = length(uv); 
    //float alpha = atan(uv.y, uv.x) / (2.*PI) + 0.5; // normalize -pi,pi to 0, 1 for display
    float alpha = atan(uv.y, uv.x); //-pi to pi
    vec2 pc = vec2(d, alpha); // polar coords
    
    //fancy calc or irregular shape
    float sinVal = sin(0.5+pc.y*3.+t*2.)*sin(pc.y*8.+t*2.)*0.04;
    float thk = 0.1;
    float res;
    float r = 0.51;
    float targetVal = r + sinVal;
    
    res = 1. - smoothstep(targetVal-thk, targetVal+thk, d);
    
    vec3 col;
    
    vec2 cPos = -1.0 + 2.0 * fragCoord.xy / iResolution.xy;
    float cLength = length(cPos);
    vec2 rippleUV = fragCoord.xy/iResolution.xy+(cPos/cLength)*cos(cLength*12.0-iTime*4.0) * 0.01;
    vec3 portalColor = texture(iChannel0,rippleUV).xyz;
    portalColor = greyscale(portalColor, 1.0);
    vec3 bgColor = vec3(0);
    
    col = mix(bgColor, portalColor, res);
    vec3 edgeColor = iPortalColor;  // add edge tint
    float edgeDist = smoothstep(targetVal-thk,targetVal+thk, d);
    if(d < targetVal+thk){
        col += edgeColor*edgeDist; // could be smoother
    }
    if (res < 0.01) discard;
    // Output to screen
    fragColor = vec4(col, 1.0);
}
 
void main() {
    mainImage(gl_FragColor, vUv * iResolution.xy);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
}
`;
