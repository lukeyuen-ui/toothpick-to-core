import {C} from '../config.js';
// How far down a row sits in the 3D scene, in world units (a cell is one unit across). The first rows are depthSurface each, so a scrape
// stays a scrape and a three-row dent stays a dent, and the rows grow taller with depth until the core sits depthCore units below the
// surface: a deep shaft reads as a very long way down, the mouth is a distant square of sky from the floor, and the finale's dive to the
// core crosses most of that distance. The mapping is a quadratic so the shaders invert it in closed form (visualRow) to paint strata and
// daylight by world height. Every renderer piece imports these two functions, or their GLSL twins, so they can never drift apart.
const V=C.three,F=C.finalRow,S=V.depthSurface,B=(V.depthCore-S*F)/(F*F);
export const depth=row=>row<=0?0:S*row+B*row*row;
export const rowAtDepth=d=>d<=0?0:(-S+Math.sqrt(S*S+4*B*d))/(2*B);
const g=n=>n.toFixed(7);
export const GLSL_DEPTH=`float visualDepth(float row){return ${g(S)}*row+${g(B)}*row*row;}`;
export const GLSL_ROW=`float visualRow(float y){float d=max(0.0,-y);return (-${g(S)}+sqrt(${g(S*S)}+${g(4*B)}*d))/${g(2*B)};}`;
