import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as d3 from "d3";
import * as three_d from 'three_d';

var tau = 6.283185307179586;
var rad2deg = 57.295779513082323;

var plots = [];

var reset_camera = function(i_plot, first_init, angles, origin) {
	var i;
	var lon = angles[0];
	var lat = angles[1];
	var psi = angles[2];
	
	var origin_vec = new THREE.Vector3(origin[0], origin[1], origin[2]);
	
	var change_quat = new THREE.Quaternion()
		.setFromEuler(new THREE.Euler(-lat, lon, psi, "YXZ"))
		.premultiply(plots[i_plot].aux_camera_quat);
	
	plots[i_plot].persp_camera.rotation.setFromQuaternion(change_quat);
	
	plots[i_plot].camera_up = new THREE.Vector3(0, 1, 0)
		.applyQuaternion(change_quat);
	
	plots[i_plot].persp_camera.position
		.set(0, 0, 1)
		.applyQuaternion(change_quat)
		.multiplyScalar(plots[i_plot].camera_r)
		.add(origin_vec);
	
	plots[i_plot].ortho_camera.position.copy(plots[i_plot].persp_camera.position);
	plots[i_plot].ortho_camera.rotation.copy(plots[i_plot].persp_camera.rotation);
	
	plots[i_plot].camera_origin = new THREE.Vector3().copy(origin_vec);
	
	if (plots[i_plot].view_type == "perspective") {
		plots[i_plot].persp_camera.fov = plots[i_plot].init_fov;
	} else {
		// Orthographic.
		plots[i_plot].ortho_camera.top    =  plots[i_plot].init_ortho_top;
		plots[i_plot].ortho_camera.bottom = -plots[i_plot].init_ortho_top;
		plots[i_plot].ortho_camera.left   = -plots[i_plot].init_ortho_right;
		plots[i_plot].ortho_camera.right  =  plots[i_plot].init_ortho_right;
	}
	
	if (!first_init) {
		for (i = 0; i < plots[i_plot].axis_text_planes.length; i++) {
			plots[i_plot].axis_text_planes[i].rotation.copy(get_current_camera(i_plot).rotation);
			plots[i_plot].axis_text_planes[i].scale.x = plots[i_plot].init_axis_title_scale;
			plots[i_plot].axis_text_planes[i].scale.y = plots[i_plot].init_axis_title_scale;
		}
		
		for (i = 0; i < plots[i_plot].tick_text_planes.length; i++) {
			plots[i_plot].tick_text_planes[i].rotation.copy(get_current_camera(i_plot).rotation);
			plots[i_plot].tick_text_planes[i].scale.x = plots[i_plot].init_tick_scale;
			plots[i_plot].tick_text_planes[i].scale.y = plots[i_plot].init_tick_scale;
		}
		
		if (plots[i_plot].have_any_labels) {
			update_labels(i_plot);
			
			for (i = 0; i < plots[i_plot].points.length; i++) {
				if (plots[i_plot].labels[i] !== null) {
					plots[i_plot].labels[i].scale.x = plots[i_plot].init_label_scale;
					plots[i_plot].labels[i].scale.y = plots[i_plot].init_label_scale;
				}
			}
		}
		
		if (plots[i_plot].geom_type == "quad") {
			for (i = 0; i < plots[i_plot].points.length; i++) {
				plots[i_plot].points[i].rotation.copy(get_current_camera(i_plot).rotation);
				set_point_size(i_plot, i, plots[i_plot].points[i].input_data.sphere_size);
			}
		}
		
		if (plots[i_plot].show_grid) {
			update_gridlines(i_plot);
		}
		
		if (plots[i_plot].dynamic_axis_labels) {
			update_axes(i_plot);
		}
		
		get_current_camera(i_plot).updateProjectionMatrix();
		update_render(i_plot);
	} else {
		get_current_camera(i_plot).updateProjectionMatrix();
	}
}

var get_current_camera = function(i_plot) {
	if (plots[i_plot].view_type == "perspective") {
		return plots[i_plot].persp_camera;
	} else {
		return plots[i_plot].ortho_camera;
	}
}

var check_webgl_fallback = function(params) {
	// https://developer.mozilla.org/en-US/docs/Learn/WebGL/By_example/Detect_WebGL
	var canvas = document.createElement("canvas");
	var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	if (!(gl && gl instanceof WebGLRenderingContext)) {
		var div_html = "";
		if (params.hasOwnProperty("fallback_image")) {
			div_html = "<img src=\"" + params.fallback_image + "\">";
		} else {
			div_html = "Sorry, you do not have WebGL enabled.";
		}
		
		var div = document.getElementById(params.div_id);
		div.innerHTML = div_html;
		
		return false;
	} else {
		return true;
	}
}

var check_surface_data_sizes = function(params) {
	var i, j;
	
	// Check to see if the data is correctly formatted.
	var x_values = params.data.x;
	var y_values = params.data.y;
	var z_values = params.data.z;
	
	var have_colors = false;
	
	if (params.data.hasOwnProperty("color")) {
		have_colors = true;
		var color_values = params.data.color;
		
		if (color_values.length != x_values.length) {
			console.warn("params.data.color does not have the same length as params.data.x; ignoring colors.");
			have_colors = false;
		}
	}
	
	if (z_values.length != x_values.length) {
		console.warn("params.data.z does not have the same length as params.data.x; plot abandoned.");
		return {"data": false, "colors": false};
	}
	
	for (i = 0; i < z_values.length; i++) {
		if (z_values[i].length != y_values.length) {
			console.warn("params.data.z[" + i + "] does not have the same length as params.data.y; plot abandoned.");
			return {"data": false, "colors": false};
		}
		
		if (have_colors) {
			if (color_values[i].length != y_values.length) {
				console.warn("params.data.color[" + i + "] does not have the same length as params.data.y; ignoring colors.");
				have_colors = false;
			}
		}
	}
	
	var have_other = true;
	if (!params.data.hasOwnProperty("other")) {
		params.data.other = [];
		
		for (i = 0; i < z_values.length; i++) {
			params.data.other.push([]);
			
			for (j = 0; j < y_values.length; j++) {
				params.data.other[i].push({});
			}
		}
	} else {
		var other_values = params.data.other;
		if (other_values.length != x_values.length) {
			console.warn("params.data.other does not have the same length as params.data.x; ignoring other.");
			have_other = false;
		}
		
		for (i = 0; i < other_values.length; i++) {
			if (other_values[i].length != y_values.length) {
				console.warn("params.data.other[" + i + "] does not have the same length as params.data.y; ignoring other.");
				have_other = false;
			}
		}
	}
	
	return {"data": true, "colors": have_colors, "other": have_other};
}

var get_font_height = function(font_style, div) {
	// Mostly from http://stackoverflow.com/a/7462767
	
	var dummy = document.createElement("div");
	
	if (div === undefined) {
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(dummy);
	} else {
		div.appendChild(dummy);
	}
	
	// I don't think the height actually varies with the letters:
	dummy.innerHTML = "Éy";
	dummy.setAttribute("style", font_style);
	
	var result = dummy.offsetHeight;
	
	if (div === undefined) {
		body.removeChild(dummy);
	} else {
		div.removeChild(dummy);
	}
	return result;
}

var basic_plot_setup = function(i_plot, params) {
	// A variable for possible use in the touch controls.
	plots[i_plot].old_t = Date.now();
	
	// Following is used to see if we should render once a photosphere
	// texture is loaded:
	plots[i_plot].tried_initial_render = false;
	
	// First up, preparing the area.
	
	plots[i_plot].container_height = plots[i_plot].parent_div.offsetHeight;
	
	plots[i_plot].scene = new THREE.Scene();
	
	plots[i_plot].container_width = plots[i_plot].parent_div.offsetWidth;
	plots[i_plot].renderer = new THREE.WebGLRenderer({"antialias": true});

	plots[i_plot].renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
	
	plots[i_plot].make_toggles = (params.hasOwnProperty("show_toggles")) ? params.show_toggles : true;
	plots[i_plot].make_snaps = (params.hasOwnProperty("show_snaps")) ? params.show_snaps : true;
	
	var toggle_div = document.createElement("div");
	toggle_div.id = "div_toggle_scatter_" + i_plot;
	var div_html = "";
	
	if (plots[i_plot].make_toggles) {
		var camera_img = "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";
		var grid_img = "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAABHNCSVQICAgIfAhkiAAAAFlJREFUSInt17EKgDAMRdFc8f9/+TkJHQQ7xATiu1vJcIY2Q5GkaOjoQLdgIH22BX+V4fkw9x6/vcLMJMW5Hp4C0mcRf7xjw2V5ncoyPB/2OpVleD5M16ftAqB5QSpf4rrTAAAAAElFTkSuQmCC";
		var ticks_img = "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAABHNCSVQICAgIfAhkiAAAAEVJREFUSInt1iEOACAMQ9GWcP8rF4XDkkH2J2eeaLLOSaKCGRUoMDAw8J+wJZXc6rk7wrZOfXFr3y/jfrD5QICBgYGfhxcjRRswVeMTTgAAAABJRU5ErkJggg==";
		var axis_title_img = "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAABHNCSVQICAgIfAhkiAAAAylJREFUSIntl1lIVGEUx8+dscywlVa1IgtboE1L2mibssKQ1okgiDasB5MKw6BArLCCgihaqV4iWqCHNlqwoGyhqDAL2yyCFCptuNmMTc69vx5G8nN0rncs6qUPzsvl3P9vzv+c+b7vagDyD5bjX0D/g0VEpOZBlsRpmmgW0XdjsXxXX6ouFHe7cPkOcZ3XG4GdeXl5eeoDTQzxebxiBHQp//RN1MnrkJIhC2alS0bGdBmXGFv/qzVNzNoaiYrV5NPrCvHW1ZSQ4hJX2lyZPztNRnSJakgm3DK/cnd9IiLyK4bvKOV72BfA1IvI7hXMjVtxhUojfG54MGDqt8jqXQ8W52h2v/Q3nWxUcmVlfDAvKYe7umklbQ0GE09hJnFK1VFj9/CqETtA+al5dBRBHCkUPPVZyzYPBowqri7rrljeivF7X6Oy/W8OMKWNIBKD62AZP5oVtQMGjM8XWdxFsbz1BPaX1cn7itma7EBE6DTvNOUBO4o2wWDw8ZybTorl0ZMO8tavU7Suf/BZ/EquWk1Ty8BAoILTs9srlkczcvEMuoogMoAN975iPU4tBQOBDydIj5UGfzERJ6O2l1ATiVCkYKjl/bE0YlRw31yeREqNHAz4S9k2SK24G0suV2K/uy0CG1RdzyRBQuzusZxrXyJDR9bjijMs6ByEdR+W0ACesPomngimyz74RxmHpsYgIjhTd1Diec72ZE2B92HNbd32ZNsE+3hakIJDBGk7jcNvg5uHrzifIarlieu5V20PbQNsot/JIUkEkc64z1ZQvzl5ebRpYAPLk3If8u1PgI3Pl1nWs66PmdeoCpkhs/o+Of3UYRvM5sfe3wTXfuDknA5BwYG53G/SRhO9KJs+quVDt1DczAFlAfbzat9EokUQZyo7n1nsEqaHG6vilao1RhQ8t7w0hAV7n+QzXBNE2jDZxlFnVF5gYUelakcqu16EuTQ0BS49ksX8yUPp4awX6TXJzdJV2Ww6WkJo9/zvzpKftZxF6cnBi4AaMb1Jnupm7fGXjapvBD7vcoQcAkqMOcHHkDZXFy6kXbj8umg18xJ6CEeD/58wf2f9BL0fPYwPEcFvAAAAAElFTkSuQmCC";
		var box_img = "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAABHNCSVQICAgIfAhkiAAAAE9JREFUSInt1zEOACAIQ9FiuP+VcSKRxFFh+Z0Iy4ud0CIiNJA1gUqS52BmLWAW7Lflr5yPG6saGBgYGBgYGBgY+H3KXd111Be4+ws1VvUGpBoNQFww7NMAAAAASUVORK5CYII=";
		
		div_html += "<table style=\"margin-left:auto;margin-right:auto;border-spacing:0px;\">";
		div_html += "<tr>";
		div_html += "<td id=\"icon_three_d_scatter_camera_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\"><img src=\"data:image/png;base64, " + camera_img + "\"></td>";
		div_html += "<td id=\"icon_three_d_scatter_grid_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\"><img src=\"data:image/png;base64, " + grid_img + "\"></td>";
		div_html += "<td id=\"icon_three_d_scatter_ticks_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\"><img src=\"data:image/png;base64, " + ticks_img + "\"></td>";
		div_html += "<td id=\"icon_three_d_scatter_axis_title_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\"><img src=\"data:image/png;base64, " + axis_title_img + "\"></td>";
		div_html += "<td id=\"icon_three_d_scatter_box_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\"><img src=\"data:image/png;base64, " + box_img + "\"></td>";
		div_html += "</tr>";
		div_html += "</table>";
	}
	
	if (plots[i_plot].make_snaps) {
		var cube_back_img = "iVBORw0KGgoAAAANSUhEUgAAABsAAAAeCAYAAADdGWXmAAAABHNCSVQICAgIfAhkiAAAA4BJREFUSIntl0FoWnccxz+xSY0aGuOrJE43kxQZdEtKd5ARhjAC0qx4KDwvenQghJGMHcty6CE59TBCGHgwh0A8VE8RlpFTCb3MHUqX2zw0TXza2DxNYXvRWPjvoCYmamJXb9sXHjz+/N7383/v9/s+3usRQgg6ksr2tkIs9oqtLQVFOaBSeYsQFcAIaJjNb0ilfsDlcrd06L24oGkqz54pPHnyiqdPFRSlQLmsNZgOAR8BtwEbYK+tpzGZXrC5uUkuV8Lj8TTDfL5Vnj8/IZ8v8O6dRvU++4Bh4CbwRc3cUjNtr+vXP2Fu7ksePYpSKpXwer0XSyYFRAW8EHAo4G8B4l8cf4qxsd+EEELs7++LxcVFsbGxIRqlAx/wGjAA0pW770QOh4NwOMzOzg6JROJ0XQcOwA/EgNQHg+qSJIlwOMzu7i7r6+t1GIALCACbwHZXgbOzs6iqyvLycuM0uoAQEAVKQFNzO5RGJlMgm82yt7fH4eEhxWKRra2ti6PvAL4DIkCZaj/bm4IC5IA88DtHRypLSyNoGpjNZiwWC+Pj40xPT2MymZpzVh2ScAPwa6AAvAQytfOjhnoz1bx9ysDADR4+/IZWQzYwMNAKVgd+D/wI/Ap8DJhqpm7Oh7muNL29xZagutrAqF30OXADkNuXvYd0V5fouwLqENY9/Q/7T8OOr6y4JGeXSa2Z198mJSCDzfaaajZbB/sK2F/ACfBHzfQtADodGAx6bt0yc++ejWDQwuTkVyQSv7C09BPhcBhJklrBTjh7qRZrpmUAenp2MRpvcucO3L9vw+//DJfL0HbnsiyTTCaJRCItgb2wzbVrY1gsg9y9a+bBg9v4/QYkSWJ19Q1WqxWfb/LyB9Agn8+HXq9nZWWFUCiEw+E4g8XjHuAlsvxt2x2/r7xeL/39/USjUQKBAC6XCwCdLM9RLks8fvwzqqp2BQbg8XiYmZkhFouRTqerMIBgMMjo6CiRSKSrQLfbTSAQIB6Pk8lkznImyzITExNEIhEymcwHgzRNQ1VVjo+PGRkZIZlMnh/9enOj0SihUKhj00Lh/DfHwcEBlUoFAKPRiMViYX5+vjln9eaura0BYLVaT00VRSGXy5HP58lmsxSLRTRNo6+v79TUbrczNTWF3W5vGv2edj8WqVSKhYUFhoaGcDqdp6aDg4MMDw9jt9txOp0tTdvpH1kNa5nouZWwAAAAAElFTkSuQmCC";
		var cube_bottom_img = "iVBORw0KGgoAAAANSUhEUgAAABsAAAAeCAYAAADdGWXmAAAABHNCSVQICAgIfAhkiAAAA8JJREFUSIntlk1IG2kYx39KYpqJHzHxa5ykLYHAIkG6LuQgwSpCTqaXainuMYcUkdVLby60yN560cPSHPQgKIX1ZKAGLwURFzzVTRe2sKjRRKNmJlp2s0lsnT2YxI+YqNTb7h9eGOZ55v97P55neMtUVVW5hmRZJhqNEg6HiUaj7O7ucnh4yNHREYIgEA6HSSQSjI6O4nQ6L/Uouwi7aKooCslkMm9aW1tLc3MzDQ0NiKKIJEkIgkAgECAUCgHgcrno6OgogGkmJyfJZDJ5UwCtVktjYyN1dXW0tbXR3NyMyWRCEISSq29qasLtdjMxMUEqlcLtdp+HjY2NMTQ0RE9PD5IkodfrrzQtJYvFgtfrZWpqinQ6jcfjycfKPR4PsVgMvV6P2Wz+KtBZoM/nIxQKMTs7ewqzWCz09fUxMzPDysrKV4NyMpvN+Hw+NjY2mJ6ePoEB2O12+vv7mZ+fZ3Fx8VaBAwMDyLLM+Pg4mlzAbrfj9XqLHu5NFIlE2N7eZnNzk3g8TiKRYGFh4RQGJ3s9ODiI3+8vONyLSiaTRKNRdnZ22NvbIxgMIssya2trABiNRkwmEzabje7ubgwGw3lYbuk+ny8P7OrqQlEU1tfXiUQiKIrCwcFBPt9oNCKKIlarFZvNxvDw8KVFVllZWQjLAYeHhxkZGSEYDGK1WjEYDIiiiNPpPNfMOQUCAfb390tW86UwAEEQcDgcVFdX09vbW9TgJiq/KkGn090K6Fqw29T/sP80LH1lRtE+K64kkcg/vHmjMDeX4MOHFJ8+pfjyJY5OV8HTp8mijV0SFov9xdu3GV6+/I2PH2Mkk2mOj3PRGuAOIAImwEU6/Sc1NUscHrouBWoymQwrKzKTkwrv3iXY2joglUqjqjpgA6jLprYA+uwo9ktq5fNnPVVVS4TDLiyW83maoaFl4BvAmJ1pS3amAhAB6oHWUhtwQXaOj+Hu3SXev/+O1lZzPlJuNrcDfwCOrKmlxMyvD1TVFh48WGZxUT6FxeM/ZOk/A3LRz28uC6r6LQ8fLhMIyFRUZEt/dfV7OjvvA/5bB0I7jx79TiCggHpGjx/PqfCTClsqqCpMqDCXfb7p+FuFuAqrKvyiglstuBE/e7aA3/8r4AUWOCmQ4tcDSAIKsA1sAnFgFziirAw0GoH6ehMOR1Vhn71+7UYU7/DixVT2Tf0Z0yiwA+xlzRNAkrIyLTqdgCSZ6OyUePKkHZdLQhDM57wLVpbTq1crPH/+I1AL3MubarU1SFIjbrdEf/89OjokwHyZRYH+BaX9mrpbeeodAAAAAElFTkSuQmCC";
		var cube_front_img = "iVBORw0KGgoAAAANSUhEUgAAABsAAAAeCAYAAADdGWXmAAAABHNCSVQICAgIfAhkiAAAAwNJREFUSIntlsFLG1kcxz+RhDFT2GrGRp2ZBXchl0UP9ZBSGkLLwpycW1Ihgpc5DCyie+ipFFrwL9CDMNB4EOLFQA5S9Fp781LaHLNdze5k1WVnEpcYY2xrDyZRG2uVpodCv/CYw+/x+cyb95j38xwdHR1xiTiOQ6FQIJ/PUygU2NnZYXd3l8PDQ0RRJJ/PUywWmZ6eJhwOn8vwfCz7GOq6LpVKpQnt7u5GlmWCwSD9/f0oioIoiiwvL5PNZgGIRCJEo9EWmXd+fp5ardaEAvh8Pnp7e+np6WF4eBhZlgkEAoiieOHq+/r60DSNZDJJtVpF07SzspmZGaamphgZGUFRFPx+/2ehF0VVVQzDYGFhgYODA3Rdb9Y6dF1ne3sbv9+PJElfJDotNE2TbDZLOp0+kamqSjweZ3FxkfX19S8WNSJJEqZpsrm5SSqVOpYBhEIhEokEKysrrK2ttVX44MFvCIJDOj2Lt1EIhUIYhvHJzb1KHMdmaekfMpm/ePnyP1y3yLt3L05kcPytJyYmsCyrZXNbUyGXK7C0tMWzZ//y6tVzKpUihvFnvd4FBICfgV+B22dljaWbptkUxmL3eP3aJZXaYHXV5s0bl/39Eu/fcwraD+jAT3WBdM7LFVtlDeHDh79z584j4vFV4EfgWh0arj8V4Gon91zZcUS2tgaBH4DYlaCfSsfnpwhtEV1S1r58l32XfROyCm/fum2VecvlMrlcjo2NDWzbxnVdSqUSogjl8h/AQPtkmUyGvb29Zs8xODiILMuoqsrTp/MUi+37g3hHR0cBGB8fb0tLcFE6JicnkSSJubk5HMf5ujKAsbExBgYGsCzrKwqrJ6cxFosxNDSEZVnYtt0mQQWwgRzw99n7TNd1BEEgmUzy+LFxRahbH1WgBBzg8YDXC8HgdW7eHGq9PDVNo7Ozk9nZBWo1gBunqg6wX4eW6uBjqCAIKEond+92cf/+L0QirR10S6/fSC63Tjj8hFJpGLgF/I/HI+DzCSjKdTSti0QiQDQa4LLtwQcpnyeKkn0kgAAAAABJRU5ErkJggg==";
		var cube_right_img = "iVBORw0KGgoAAAANSUhEUgAAABsAAAAeCAYAAADdGWXmAAAABHNCSVQICAgIfAhkiAAAA8ZJREFUSIntl81LI3cYxz+rhuhYjMkoMW+NWwgFXyLNQYpbCqGQQyGgGHFR8JKDUCR4XhRzWP+A7UE2sPEgVBbssksvypbCIrtCs4VFix7qwWpeJrHJaMQM0bCdHtxkN5iobXNrv8fhy/cz8+N5nt8zt1RVVbmBMpkM8Xic/f194vE4qVSKbDZLoVBApxN4+jTLzs4pwWCAubn+ihkN14XKsoyiKBQKBQRBQK/XYzab6erqwmQyYbFYEASB7e0tdnZ+IxhcBfLMzX15Gba4uMj5+XkpFECj0WA0Gmlra8PlcmE2mzEYDAiCUPXL6+sBPgY+JxgMI0l5Hj70lJucTqcaDofVzc1NNZ1Oq7lcTv0nGh7eVOFnFVQVoirMq8PDP5R56rxeL8lkkqamJkRRvPLtby4rMMmTJ7/idn9felpntVoZGRlheXmZSCRSA1BRIjDJixe/09f33QUMwOFwMDY2xurqKuvr6zUGfsPWVgaz+dv31ehwOPD7/YTDYfL5PB6P54qQq6QAMpAADoA0cIQkPS8vfavVytTUFKFQiLOzM7xeb/VIRSEejyNJEtnsIbu7r4EM0PHO0QoYgE+Ar4Dmy30miiKTk5MloNvtRpZl9vb2iMViyLLM8fFxyd/a2kpnpwmd7lOgBfgaqFRkH12GFYHT09PMzMywtraGzWajubkZk8lEf39/WTMX9fjxFpCvArpQRRiAIAj09PTQ0tKCz+erGvB3VHedQavV1gR0I1gt9T/sPwx7+/Z6T9U+q6YPx1Q0GkWSJM7PcyhKFugBKq8EV8IURSGZTBKNRjk5OUGSpEtjymAw4HQ6uX37NvfuGbhzJ87GxnPgCypNkobT01N2d3crzr7t7W1EUaS7u7vqmPpQr16JDA018ezZy4rA+lwuFywuNHq9HqfTidvtZnBwEEVRcLlcDA0NYbfbEUURjUZT9ZgA7t4VicX+5M2b14ANKPp/oWF0dBSAiYmJGq0E8OiRg46OJubnfwIGuLhEoS4QCCCKIgsLC2QymZrAAO7ft/LgwWfABhcX6rvSHx8fp7Ozk1AoVFNgIGBlZWUAeAmcvu8zn89Hb28voVCIWCz2r0GKopDJZOjrixMM/gH8WF76Xq8XrVZLOBzG7/ffOFSWZRKJBAcHB6TTaVKpFIVCAbi4F202AysrE5f7zOPx0NjYyNLSEgDt7e2l0GIzHx4ekkgkODo6QlEUNBoNgiBgMBiwWCwMDAxgsVgQRbEs+1a1H4tIJMLs7Cx6vR673V4K1el0GI1GLBYLdru9Ymg1/QW4hNSnAVbhAgAAAABJRU5ErkJggg==";
		var cube_left_img = "iVBORw0KGgoAAAANSUhEUgAAABsAAAAeCAYAAADdGWXmAAAABHNCSVQICAgIfAhkiAAAA5JJREFUSIntlk9IW1kUh7+2xoxP0eTFmry8iBhwFqVk4SILKylBSJGZLIq6EWaVRYoM1HVxkSLdi8jQQLMRlAEDLbzFiBvLYLuYnZNlQI35Z9SXGGd8JhOKs3CM0fzrYHYz3/Zefh8H7jn33Lu4uLjgK1BVlWQySSwWI5lMkslkyOfzlEolBEEgFouRy+WYn5/H6XTWzLh3W3Y7NJvNomlaOdRoNGK1Wunr60OSJGRZRhAEFEUhEokAMDo6isvlqpK1hcMrnJ7+wcHBZSiATqfDbDbT29vL8PAwVqsVURQRBKFh9RaLBY/HQygUolAo4PF4bsqmpn4iEPiB6envEUWZjo6OpqGNsNls+Hw+lpeXKRaLeL3e8tl98BEIZNne7sBkMt1JVCn0+/1EIhHC4XCl7DEwxdTUKouLv91ZdIXJZMLv97O3t8fKysqVDGAImObly1+Ym/u1pcKZmRlUVWVxcZG266MhwMebNyEODgq8e+epG9KMRCJBKpVif3+f4+NjcrkcGxsblTIAG/AjoVAQVS3y/r23ZhiApmkkk0nS6TSHh4esr6+jqio7OzsAGAwGRFHEbrczNjZGZ2fnbRmACfDz4UOQJ0+KfPrkJhrNsru7SyKRIJvNcnJyUr5tMBiQJIn+/n7sdjuzs7M1H1lXV1ct2ZVwls+f53j2bJ2nT/tpb+9EkiScTueNZr5CURSOjo4avuY6MgABeIwgdPPq1WT9a/+C+80uPHigb4noq2St5H/Zf1hWLBab3mnQZ7WpHFPxeJx0Os3Z2RnxeJzu7m40Tavb2E1kf3F4GCEcPmVvL101pkRRxOFwMDg4iCiKbG5usrCwgN/vx2Qy1ZIVGsry+X30+m/rjqlKJicnURSFYDBYU9gGhw1kXQwNfXfja2+G1+tFr9eztLSEz+fDZrOVz+5LUh/Qug8TwOPx4Ha7CYVCRKPRa1kq5cLh+OYfodYyocvlYnx8nNXV1bKwDWB724nb/TsfP24Bo1xO/LvjdDoxGo2sra2hadp1n21uOpiYsABbtKJCTdNQVZXz83MsFguKolRvxC9eRAkGd7ms8GcmJh4SDjdeD7LZ7I2dI5PJUCqVABAEAVEUaW9vr+6zt2+HkKQOAoEt4E++fHlYDq3cOVKpFLlcDk3T0Ol05VBZlhkZGUGW5aqnX1XZFa9fJwgEAjx6VOD5c5l8/jK0p6cHs9mMLMsMDAzUDK3H3x0DgYWMs5l/AAAAAElFTkSuQmCC";
		var cube_top_img = "iVBORw0KGgoAAAANSUhEUgAAABsAAAAeCAYAAADdGWXmAAAABHNCSVQICAgIfAhkiAAAA71JREFUSIntl01Im3ccxz+JZsmyEZPnUTQ8kehQHKhp8RCYbBm5CB5SlGZYUvBQD7kM7aG9lEl378WTNIdcPHio1EFz2NqLL8goIqWTespAyKtvidGaf0wjfXZIfFuSqau37Qt/Ep6Xz+fHP78fzxONqqoql4pgcTHN9HSaV68yxON7FAp5VDUP6EtrnydPvufBA1tFQm0ZUgiWltI8e5Zmfj5DPH5IPp+nWJIeMABm4Cvgc0A+c3eKhw9/J5uFx4/LhZq+vgX13TvY3t7j6IgzUHMJLJWW8XIbgACW8Ptbefq0/e8nv1PhpQo7KmTVou5TV1aFl+rt23+oZ6MdGPgGWAHiV6j+ohiBb3n+fAO3e/XkqNbjaeXFix+AX4Dla5KdCufnM9y4UeRqP3wAj6edhQUfGs2vwOI1C12srh5SX7942o0uVztv345w82YQVT0E+v6lQABpIAFESp8HpFIL51vf4bARifyI3R7g48c84LkAGgeSQBT4E9gDjGg0YDCYaW6WcLu/5t69Vl6//qx8zmw2mffv/dTVBTg6ygPuUqXrQKz0PQOAVgtGo5mODistLTp6eup59Og+lRrtzZsvy2UARqPM3t59JOkn8vnfqKlpxmT6gq4uK7duOblzx4rNppyDhkIhtre3K4qOU1FWFBqZnOyiocGEx+OtCrhKtBdfor8W0SVl15f/Zf9hWT6fv/CaqnNWLUII4vE4yWSSaDRKMpkkm80SjUYxmUwIITAaKw92VZkQgo2NDaLRKPv7+ySTSTKZzMl5s9mMJEk4HA5aW1uRJIm5uTkmJibw+/3IslzGrD04OCAcDrO+vk4sFiOdTp9A19bWkGWZzs5OnE4nVqsVRVGqVu71egmFQgQCgYrCmmw2+7MQgkKhgMViweFw4Ha7GRgYQAhBT08Pg4OD2O12ZFlGp9P94zZ3dHSQy+WYnZ2lra0Nk8kEwMrKCrVDQ0MADA8PV634qunr68NgMBAMBvH5fLS3F198tKOjo8iyzOTkJKlU6lpkAC6Xi/7+fqanpwmHw0UZwN27d2lpaSEQCFyr0Ol04vP5mJmZIRaLnc6Z1+ulu7ubQCBALBb7ZJEQglQqRS6Xo6mpiVAodL71PR4Per2eYDDIyMjIpaHpdJpEIkEkEmFnZ4fNzU0KhQJQfC5KksTY2Fj5nB3/uFNTUwA0NDScQI+HeWtri0Qiwe7uLkIIdDrdCVRRFHp7e1EUpaz1NdX+WCwvLzM+Po7FYsFut59A6+rqaGxsRFEU7HZ7RWi1/AW9hKN9Ep/IIwAAAABJRU5ErkJggg==";
		
		div_html += "<table style=\"margin-left:auto;margin-right:auto;border-spacing:0px;\">";
		div_html += "<tr>";
		div_html += "<td id=\"icon_three_d_scatter_snap_home_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\">Reset</td>";
		div_html += "<td id=\"icon_three_d_scatter_snap_top_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\"><img src=\"data:image/png;base64, " + cube_top_img + "\"></td>";
		div_html += "<td id=\"icon_three_d_scatter_snap_bottom_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\"><img src=\"data:image/png;base64, " + cube_bottom_img + "\"></td>";
		div_html += "<td id=\"icon_three_d_scatter_snap_left_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\"><img src=\"data:image/png;base64, " + cube_left_img + "\"></td>";
		div_html += "<td id=\"icon_three_d_scatter_snap_right_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\"><img src=\"data:image/png;base64, " + cube_right_img + "\"></td>";
		div_html += "<td id=\"icon_three_d_scatter_snap_front_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\"><img src=\"data:image/png;base64, " + cube_front_img + "\"></td>";
		div_html += "<td id=\"icon_three_d_scatter_snap_back_" + i_plot + "\" style=\"cursor:pointer;padding-left:5px;;padding-right:5px;\"><img src=\"data:image/png;base64, " + cube_back_img + "\"></td>";
		div_html += "</tr>";
		div_html += "</table>";
	}
	
	if (plots[i_plot].make_toggles || plots[i_plot].make_snaps) {
		toggle_div.innerHTML = div_html;
		plots[i_plot].parent_div.appendChild(toggle_div);
	}
	
	var width, height;
	var margin_left = parseInt(plots[i_plot].parent_div.style.paddingLeft);
	var border_left = parseInt(plots[i_plot].parent_div.style.borderLeft);
	var margin_right = parseInt(plots[i_plot].parent_div.style.paddingRight);
	var border_right = parseInt(plots[i_plot].parent_div.style.borderRight);
	
	margin_left = isNaN(margin_left) ? 0 : margin_left;
	margin_right = isNaN(margin_right) ? 0 : margin_right;
	border_left = isNaN(border_left) ? 0 : border_left;
	border_right = isNaN(border_right) ? 0 : border_right;
	
	var margins = margin_left + margin_right + border_left + border_right;
	
	if (!params.hasOwnProperty("width") && !params.hasOwnProperty("height")) {
		width = Math.min(plots[i_plot].parent_div.offsetWidth - margins, window.innerHeight);
		height = width;
	} else {
		if (params.hasOwnProperty("width") && params.hasOwnProperty("height")) {
			width = params.width;
			height = params.height;
		} else {
			if (params.hasOwnProperty("width")) {
				width = params.width;
				height = Math.min(width, window.innerHeight);
			} else {
				height = params.height;
				width = Math.min(plots[i_plot].parent_div.offsetWidth - margins, window.innerHeight);
			}
		}
	}
	
	var temp_width = width + margins;
	
	// Make the scene a little bit larger (but hidden) so that points
	// don't suddenly disappear from the screen when their centroid
	// leaves the visible area.
	plots[i_plot].max_point_height = (params.hasOwnProperty("max_point_height")) ? params.max_point_height : 25;
	
	var hidden_margin = 0;
	if (plots[i_plot].geom_type == "point") {
		if (params.hasOwnProperty("hidden_margins")) {
			hidden_margin = params.hidden_margins ? Math.ceil(plots[i_plot].max_point_height / 2) : 0;
		}
	}
	
	plots[i_plot].renderer.setSize(width + 2*hidden_margin, height + 2*hidden_margin);
	plots[i_plot].parent_div.style.width = width + "px";
	
	var wrapper_div = document.createElement("div");
	wrapper_div.style.width = width + "px";
	wrapper_div.style.height = height + "px";
	wrapper_div.style.overflow = "hidden";
	plots[i_plot].parent_div.appendChild(wrapper_div);
	
	plots[i_plot].renderer.domElement.style.position = "relative";
	plots[i_plot].renderer.domElement.style.marginTop = -hidden_margin + "px";
	plots[i_plot].renderer.domElement.style.marginLeft = -hidden_margin + "px";
	
	wrapper_div.appendChild(plots[i_plot].renderer.domElement);
	
	plots[i_plot].width = width + 2*hidden_margin;
	plots[i_plot].height = height + 2*hidden_margin;
	
	plots[i_plot].mid_x = plots[i_plot].width / 2;
	plots[i_plot].mid_y = plots[i_plot].height / 2;
	
	var bg_color = (params.hasOwnProperty("background_color")) ? params.background_color : "#000000";
	var bg_color_hex;
	
	var tiny_div = document.createElement("div");
	tiny_div.style.width = "1px";
	tiny_div.style.height = "1px";
	plots[i_plot].parent_div.appendChild(tiny_div);
	
	if (typeof(bg_color) == "string") {
		bg_color_hex = css_color_to_hex(bg_color, tiny_div);
	} else {
		bg_color_hex = bg_color;
		bg_color = hex_to_css_color(bg_color);
	}
	
	plots[i_plot].bg_color = bg_color;
	plots[i_plot].bg_color_hex = bg_color_hex;
	plots[i_plot].scene.background = new THREE.Color(bg_color_hex);
	
	var aspect = plots[i_plot].width / plots[i_plot].height;
	
	plots[i_plot].null_width = (params.hasOwnProperty("null_width")) ? params.null_width/2 : 0.5;
	plots[i_plot].null_width_time = (params.hasOwnProperty("null_width_time")) ? params.null_width_time/2 : 30000;
	
	// Set up the camera(s).
	
	plots[i_plot].init_lonlat = [-3*tau/8, tau/8];
	if (params.hasOwnProperty("init_lonlat")) {
		plots[i_plot].init_lonlat = JSON.parse(JSON.stringify(params.init_lonlat));
	}
	
	plots[i_plot].init_rot = params.hasOwnProperty("init_camera_rot") ? params.init_camera_rot : 0;
	plots[i_plot].camera_r = params.hasOwnProperty("camera_r") ? params.camera_r : 5;
	
	if (params.hasOwnProperty("camera_distance_scale")) {
		plots[i_plot].camera_distance_scale = params.camera_distance_scale;
	} else {
		plots[i_plot].camera_distance_scale = Math.max(plots[i_plot].camera_r, 1);
	}
	
	plots[i_plot].camera_origin = new THREE.Vector3(0, 0, 0);
	plots[i_plot].init_origin = [0, 0, 0];
	if (params.hasOwnProperty("init_camera_origin")) {
		plots[i_plot].init_origin = JSON.parse(JSON.stringify(params.init_camera_origin));
		plots[i_plot].camera_origin.x = params.init_camera_origin[0];
		plots[i_plot].camera_origin.y = params.init_camera_origin[1];
		plots[i_plot].camera_origin.z = params.init_camera_origin[2];
		
		plots[i_plot].init_origin = JSON.parse(JSON.stringify(params.init_camera_origin));
	}
	
	plots[i_plot].view_type = (params.hasOwnProperty("view_type")) ? params.view_type : "perspective";
	
	plots[i_plot].max_fov = (params.hasOwnProperty("max_fov")) ? params.max_fov : 90;
	plots[i_plot].min_fov = (params.hasOwnProperty("min_fov")) ? params.min_fov : 1;
	plots[i_plot].max_pan_dist_sq = (params.hasOwnProperty("max_pan_distance")) ? params.max_pan_distance : 0.5*plots[i_plot].camera_r;
	
	plots[i_plot].max_pan_dist_sq = plots[i_plot].max_pan_dist_sq * plots[i_plot].max_pan_dist_sq;
	
	var theta, ortho_top, ortho_right;
	if (plots[i_plot].view_type == "perspective") {
		plots[i_plot].init_fov = (params.hasOwnProperty("fov")) ? params.fov : 47.25;
		
		theta = plots[i_plot].init_fov / 2;
		ortho_top = plots[i_plot].camera_distance_scale * Math.tan(theta / rad2deg);
		ortho_right = ortho_top * aspect;
	} else {
		// Orthographic.
		if (params.hasOwnProperty("ortho_right")) {
			ortho_right = params.ortho_right;
			ortho_top = ortho_right / aspect;
		} else if (params.hasOwnProperty("ortho_top")) {
			ortho_top = params.ortho_top;
			ortho_right = ortho_top * aspect;
		} else {
			plots[i_plot].init_fov = (params.hasOwnProperty("fov")) ? params.fov : 47.25;
			
			ortho_top = plots[i_plot].camera_distance_scale * Math.tan(0.5 * plots[i_plot].init_fov / rad2deg);
			ortho_right = ortho_top * aspect;
		}
		
		theta = Math.atan2(ortho_top, plots[i_plot].camera_distance_scale) * rad2deg * 2;
		if (theta > 90) { theta = 90; }
		
		plots[i_plot].init_fov = theta;
	}
	
	var frustum_far = (plots[i_plot].camera_distance_scale < 5) ? 50 : 10 * plots[i_plot].camera_distance_scale;
	
	plots[i_plot].persp_camera = new THREE.PerspectiveCamera(
		plots[i_plot].init_fov,
		aspect,
		0.01,
		frustum_far);
	
	
	plots[i_plot].init_ortho_top = ortho_top;
	plots[i_plot].init_ortho_right = ortho_right;
	
	plots[i_plot].ortho_camera = new THREE.OrthographicCamera(
		-ortho_right, ortho_right, ortho_top, -ortho_top, 0.01, frustum_far);
	
	plots[i_plot].persp_camera.rotation.order = "ZYX";
	plots[i_plot].ortho_camera.rotation.order = "ZYX";
	
	plots[i_plot].aux_camera_quat = new THREE.Quaternion()
		.setFromEuler(new THREE.Euler(tau/4, 0, tau/4, "ZYX"));
	
	reset_camera(
		i_plot,
		true,
		[plots[i_plot].init_lonlat[0], plots[i_plot].init_lonlat[1], plots[i_plot].init_rot],
		plots[i_plot].init_origin);
	
	plots[i_plot].rotation_dir = 1;
	if (params.hasOwnProperty("reverse_rotation")) {
		plots[i_plot].rotation_dir = params.reverse_rotation ? -1 : 1;
	}
	
	plots[i_plot].rotate_less_with_zoom = params.hasOwnProperty("rotate_less_with_zoom") ? params.rotate_less_with_zoom : false;
	
	
	// Preparing the font for labels etc.
	
	var font = (params.hasOwnProperty("font")) ? params.font : "Arial, sans-serif";
	plots[i_plot].font = font;
	
	var test_font_size = 96;
	// The 1.08 is a fudge factor; the get_font_height() function doesn't really work.
	plots[i_plot].font_ratio = 1.08 * get_font_height("font-family: " + font + "; font-size: " + test_font_size + "px", plots[i_plot].parent_div) / test_font_size;
	
	plots[i_plot].mouse = new THREE.Vector2();
	plots[i_plot].raycaster = new THREE.Raycaster();
	
	plots[i_plot].parent_div.removeChild(tiny_div);
	
	if (params.hasOwnProperty("photosphere_image")) {
		var photosphere_radius = params.hasOwnProperty("photosphere_radius") ? params.photosphere_radius : 1;
		
		var width_segments = params.hasOwnProperty("photosphere_width_segments") ? params.photosphere_width_segments : 60;
		var height_segments = params.hasOwnProperty("photosphere_height_segments") ? params.photosphere_height_segments : 60;
		
		plots[i_plot].photosphere_geometry = new THREE.SphereGeometry(photosphere_radius, width_segments, height_segments);
		var geom_scale = -1;
		if (params.hasOwnProperty("photosphere_inverted")) {
			if (params.photosphere_inverted) {
				geom_scale = 1;
			}
		}
		
		plots[i_plot].photosphere_geometry.scale(geom_scale, 1, 1);
		
		plots[i_plot].photosphere_texture = new THREE.TextureLoader().load(params.photosphere_image, function() {
			add_photosphere(i_plot, params);
		});
	}
}

var make_axes = function(i_plot, params, append) {
	// Sometimes this will be called when the plot is
	// first initialised; sometimes it will be when the
	// data is updated change_data() calls it.
	
	if (append === undefined) {
		append = false;
	}
	
	var i, j, k, l;
	var axes = ["x", "y", "z", "size"];
	
	var specify_axis_lengths = params.hasOwnProperty("axis_length_ratios");
	var fix_axes = false;
	var same_scale;
	
	if (!append) {
		var time_axis = params.hasOwnProperty("time_axis") ? JSON.parse(JSON.stringify(params.time_axis)) : [false, false, false];
		plots[i_plot].time_axis = JSON.parse(JSON.stringify(time_axis));
	} else {
		time_axis = JSON.parse(JSON.stringify(plots[i_plot].time_axis));
	}
	
	if (specify_axis_lengths) {
		var axis_length_ratios = JSON.parse(JSON.stringify(params.axis_length_ratios));
		var max_axis_ratio = d3.max(axis_length_ratios);
		fix_axes = true;
		
		// Poorly named:
		same_scale = [true, true, true];
	} else {
		if (params.hasOwnProperty("same_scale")) {
			same_scale = JSON.parse(JSON.stringify(params.same_scale));
		} else {
			same_scale = [false, false, false];
		}
		
		var num_same_scales = 0;
		
		for (i = 0; i < same_scale.length; i++) {
			if (same_scale[i]) { num_same_scales++; }
		}
		if (num_same_scales > 1) { fix_axes = true; }
	}
	
	
	if (plots[i_plot].plot_type == "scatter") {
		if (params.hasOwnProperty("size_scale_bound")) {
			if (plots[i_plot].size_exponent == 0) {
				params.scaled_size_scale_bound = 1;
			} else {
				params.scaled_size_scale_bound = Math.pow(params.size_scale_bound, 1/plots[i_plot].size_exponent);
			}
		}

		for (i = 0; i < params.data.length; i++) {
			if (plots[i_plot].size_exponent == 0) {
				params.data[i].scaled_size = 1;
			} else {
				params.data[i].scaled_size = Math.pow(params.data[i].size, 1/plots[i_plot].size_exponent);
			}
		}
	}
	
	
	var tiny_div = document.createElement("div");
	tiny_div.style.width = "1px";
	tiny_div.style.height = "1px";
	plots[i_plot].parent_div.appendChild(tiny_div);
	
	var axis_color;
	if (params.hasOwnProperty("axis_color")) {
		axis_color = params.axis_color;
	} else {
		if (!plots[i_plot].hasOwnProperty("axis_color")) {
			axis_color = 0xFFFFFF;
		} else {
			axis_color = plots[i_plot].axis_color;
		}
	}
	
	if (typeof(axis_color) == "string") {
		axis_color = css_color_to_hex(axis_color, tiny_div);
	}
	
	plots[i_plot].axis_color = axis_color;
	
	var line_material = new THREE.LineBasicMaterial({"color": axis_color});
	
	var axis_ranges = [100, 100, 100, 100];
	var max_fixed_range = -1;
	var this_axis_range;
	var this_domain;
	var temp_min1, temp_max1, temp_min2, temp_max2;
	
	if (!append) {
		plots[i_plot].domains = [];
	}
	plots[i_plot].ranges = [];
	plots[i_plot].scales = [];
	
	var adjust_domains;
	
	for (i = 0; i < 3; i++) {
		adjust_domains = true;
		
		if (params.hasOwnProperty(axes[i] + "_scale_bounds")) {
			this_domain = JSON.parse(JSON.stringify(params[axes[i] + "_scale_bounds"]));
			plots[i_plot].domains.push([this_domain[0], this_domain[1]]);
			adjust_domains = false;
			
			if ((i == 2) && (plots[i_plot].plot_type == "surface")) {
				if (!params.hasOwnProperty("color_scale_bounds")) {
					plots[i_plot].color_domain = plots[i_plot].domains[2].slice(0);
				} else {
					plots[i_plot].color_domain = params.color_scale_bounds.slice(0);
				}
			}
		} else {
			if (plots[i_plot].plot_type == "scatter") {
				temp_min1 = d3.min(params.data, function(d) { return d[axes[i]]; });
				temp_max1 = d3.max(params.data, function(d) { return d[axes[i]]; });
				
				if (append) {
					temp_min2 = d3.min(plots[i_plot].points, function(d) { return d.input_data[axes[i]]; });
					temp_max2 = d3.max(plots[i_plot].points, function(d) { return d.input_data[axes[i]]; });
					
					plots[i_plot].domains[i][0] = d3.min([temp_min1, temp_min2]);
					plots[i_plot].domains[i][1] = d3.max([temp_max1, temp_max2]);
				} else {
					plots[i_plot].domains.push([temp_min1, temp_max1]);
				}
			} else if (plots[i_plot].plot_type == "surface") {
				if (i < 2) {
					// x or y.
					
					temp_min1 = d3.min(params.data[axes[i]]);
					temp_max1 = d3.max(params.data[axes[i]]);
					
					if (append) {
						if (i == 0) {
							// x.
							temp_min2 = d3.min(plots[i_plot].mesh_points, function(d) { return d[0].input_data.x; });
							temp_max2 = d3.max(plots[i_plot].mesh_points, function(d) { return d[0].input_data.x; });
						} else if (i == 1) {
							// y.
							temp_min2 = d3.min(plots[i_plot].mesh_points[0], function(d) { return d.input_data.y; });
							temp_max2 = d3.max(plots[i_plot].mesh_points[0], function(d) { return d.input_data.y; });
						}
						
						plots[i_plot].domains[i][0] = d3.min([temp_min1, temp_min2]);
						plots[i_plot].domains[i][1] = d3.max([temp_max1, temp_max2]);
					} else {
						plots[i_plot].domains.push([temp_min1, temp_max1]);
					}
				} else if (i == 2) {
					// z.
					
					temp_min1 = d3.min(params.data.z, function(d) { return d3.min(d); });
					temp_max1 = d3.max(params.data.z, function(d) { return d3.max(d); });
					
					if (append) {
						
						temp_min2 = d3.min(plots[i_plot].mesh_points, function(d) { return d3.min(d, function(d2) { return d2.input_data.z; }); });
						temp_max2 = d3.max(plots[i_plot].mesh_points, function(d) { return d3.max(d, function(d2) { return d2.input_data.z; }); });
						
						plots[i_plot].domains[i][0] = d3.min([temp_min1, temp_min2]);
						plots[i_plot].domains[i][1] = d3.max([temp_max1, temp_max2]);
					} else {
						plots[i_plot].domains.push([temp_min1, temp_max1]);
					}
					
					if (!params.hasOwnProperty("color_scale_bounds")) {
						plots[i_plot].color_domain = plots[i_plot].domains[2].slice(0);
						if (time_axis[i]) {
							plots[i_plot].color_domain[0] = new Date(JSON.parse(JSON.stringify(plots[i_plot].color_domain[0])));
							plots[i_plot].color_domain[1] = new Date(JSON.parse(JSON.stringify(plots[i_plot].color_domain[1])));
							
							if (plots[i_plot].color_domain[0].getTime() == plots[i_plot].color_domain[1].getTime()) {
								plots[i_plot].color_domain[0].setTime(plots[i_plot].color_domain[0].getTime() - plots[i_plot].null_width_time);
								plots[i_plot].color_domain[1].setTime(plots[i_plot].color_domain[1].getTime() + plots[i_plot].null_width_time);
							}
						} else {
							if (plots[i_plot].color_domain[0] == plots[i_plot].color_domain[1]) {
								plots[i_plot].color_domain[0] -= plots[i_plot].null_width;
								plots[i_plot].color_domain[1] += plots[i_plot].null_width;
							}
						}
					} else {
						plots[i_plot].color_domain = params.color_scale_bounds.slice(0);
					}
				}
			}
		}
		
		if (time_axis[i]) {
			// It looks like for a time axis, the domains[i] contains
			// shallow copies of the min and max from the data, so go
			// through JSON to prevent the input data values from being
			// changed when the axis extents are changed (!).
			plots[i_plot].domains[i][0] = new Date(JSON.parse(JSON.stringify(plots[i_plot].domains[i][0])));
			plots[i_plot].domains[i][1] = new Date(JSON.parse(JSON.stringify(plots[i_plot].domains[i][1])));
			
			this_axis_range = plots[i_plot].domains[i][1].getTime() - plots[i_plot].domains[i][0].getTime();
		} else {
			this_axis_range = plots[i_plot].domains[i][1] - plots[i_plot].domains[i][0];
		}
		
		axis_ranges[i] = this_axis_range;
		
		
		if (this_axis_range == 0) {
			if (time_axis[i]) {
				plots[i_plot].domains[i][0].setTime(plots[i_plot].domains[i][0].getTime() - plots[i_plot].null_width_time);
				plots[i_plot].domains[i][1].setTime(plots[i_plot].domains[i][1].getTime() + plots[i_plot].null_width_time);
			} else {
				plots[i_plot].domains[i][0] -= plots[i_plot].null_width;
				plots[i_plot].domains[i][1] += plots[i_plot].null_width;
			}
		} else {
			if (adjust_domains) {
				if (time_axis[i]) {
					plots[i_plot].domains[i][0].setTime(plots[i_plot].domains[i][0].getTime() - 0.1*this_axis_range);
					plots[i_plot].domains[i][1].setTime(plots[i_plot].domains[i][1].getTime() + 0.1*this_axis_range);
				} else {
					plots[i_plot].domains[i][0] -= 0.1*this_axis_range;
					plots[i_plot].domains[i][1] += 0.1*this_axis_range;
				}
			}
		}
		
		if (fix_axes && same_scale[i]) {
			if (this_axis_range > max_fixed_range) {
				max_fixed_range = this_axis_range;
			}
		}
	}
	
	if (plots[i_plot].plot_type == "scatter") {
		// Sphere min size extent is always zero.
		if (params.hasOwnProperty("size_scale_bound")) {
			plots[i_plot].domains.push([0, params.scaled_size_scale_bound]);
		} else {
			temp_max1 = d3.max(params.data, function(d) { return d.scaled_size; });
			
			if (append) {
				temp_max2 = d3.max(plots[i_plot].points, function(d) { return d.input_data.scaled_size; });
				plots[i_plot].domains[3][1] = d3.max([temp_max1, temp_max2]);
			} else {
				plots[i_plot].domains.push([0, temp_max1]);
			}
		}
	}
	
	var axis_scale_factor = [1, 1, 1];
	for (i = 0; i < 3; i++) {
		if (fix_axes && same_scale[i]) {
			axis_scale_factor[i] = axis_ranges[i] / max_fixed_range;
		}
		
		if (fix_axes && specify_axis_lengths) {
			axis_scale_factor[i] = axis_length_ratios[i] / max_axis_ratio;
		}
		
		plots[i_plot].ranges.push([-axis_scale_factor[i], axis_scale_factor[i]]);
	}
	
	if (plots[i_plot].plot_type == "scatter") {
		if (params.hasOwnProperty("max_point_height")) {
			plots[i_plot].max_point_height = params.max_point_height;
		} else {
			if (!plots[i_plot].hasOwnProperty("max_point_height")) {
				plots[i_plot].max_point_height = 25;
			}
		}
	
		plots[i_plot].ranges.push([0, plots[i_plot].max_point_height]);
	}
	
	var n_axes = 4;
	time_axis.push(false);
	if (plots[i_plot].plot_type == "surface") { n_axes = 3; }
	
	for (i = 0; i < n_axes; i++) {
		
		if (time_axis[i]) {
			plots[i_plot].scales.push(
				d3.scaleTime()
					.domain(plots[i_plot].domains[i])
					.range(plots[i_plot].ranges[i])
			);
		} else {
			plots[i_plot].scales.push(
				d3.scaleLinear()
					.domain(plots[i_plot].domains[i])
					.range(plots[i_plot].ranges[i])
			);
		}
	}
	
	
	var box_geom = new THREE.Geometry();
	// LineSegments draws a segment between vertices 0 and 1, 2, and 3, 4 and 5, ....
	
	// Base:
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0], -axis_scale_factor[1], -axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0],  axis_scale_factor[1], -axis_scale_factor[2]));
	
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0],  axis_scale_factor[1], -axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0],  axis_scale_factor[1], -axis_scale_factor[2]));
	
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0],  axis_scale_factor[1], -axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0], -axis_scale_factor[1], -axis_scale_factor[2]));
	
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0], -axis_scale_factor[1], -axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0], -axis_scale_factor[1], -axis_scale_factor[2]));
	
	// Top:
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0], -axis_scale_factor[1],  axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0],  axis_scale_factor[1],  axis_scale_factor[2]));
	
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0],  axis_scale_factor[1],  axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0],  axis_scale_factor[1],  axis_scale_factor[2]));
	
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0],  axis_scale_factor[1],  axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0], -axis_scale_factor[1],  axis_scale_factor[2]));
	
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0], -axis_scale_factor[1],  axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0], -axis_scale_factor[1],  axis_scale_factor[2]));
	
	// Vertical edges:
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0],  axis_scale_factor[1], -axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0],  axis_scale_factor[1],  axis_scale_factor[2]));
	
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0], -axis_scale_factor[1], -axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0], -axis_scale_factor[1],  axis_scale_factor[2]));
	
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0],  axis_scale_factor[1], -axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3( axis_scale_factor[0],  axis_scale_factor[1],  axis_scale_factor[2]));
	
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0], -axis_scale_factor[1], -axis_scale_factor[2]));
	box_geom.vertices.push(new THREE.Vector3(-axis_scale_factor[0], -axis_scale_factor[1],  axis_scale_factor[2]));
	
	plots[i_plot].axis_box = new THREE.LineSegments(box_geom, line_material);
	
	if (!(plots[i_plot].hasOwnProperty("show_box"))) {
		plots[i_plot].show_box = (params.hasOwnProperty("show_box")) ? params.show_box : true;
	}
	
	if (plots[i_plot].show_box) {
		plots[i_plot].scene.add(plots[i_plot].axis_box);
	}
	
	// Axis ticks.
	var num_ticks = (params.hasOwnProperty("num_ticks")) ? JSON.parse(JSON.stringify(params.num_ticks)) : [4, 4, 4];
	var tick_lengths = (params.hasOwnProperty("tick_lengths")) ? JSON.parse(JSON.stringify(params.tick_lengths)) : [0.03, 0.03, 0.03];
	
	if (!(plots[i_plot].hasOwnProperty("show_ticks"))) {
		plots[i_plot].show_ticks = (params.hasOwnProperty("show_ticks")) ? JSON.parse(JSON.stringify(params.show_ticks)) : true;
	}
	
	var tick_formats, dx, dec_places, sig_figs, max_abs_value;
	var axis_tick_values = [];
	var axis_key;
	
	for (i = 0; i < 3; i++) {
		axis_key = axes[i] + "_tick_values";
		if (params.hasOwnProperty(axis_key)) {
			axis_tick_values.push(JSON.parse(JSON.stringify(params[axis_key])));
		} else {
			if (time_axis[i]) {
				axis_tick_values.push(d3.scaleTime().domain(plots[i_plot].domains[i]).ticks(num_ticks[i]));
			} else {
				axis_tick_values.push(d3.scaleLinear().domain(plots[i_plot].domains[i]).ticks(num_ticks[i]));
			}
		}
	}
	
	var this_dx;
	
	if (params.hasOwnProperty("tick_formats")) {
		tick_formats = JSON.parse(JSON.stringify(params.tick_formats));
	} else {
		tick_formats = ["", "", ""];
	}
	
	for (i = 0; i < 3; i++) {
		if (tick_formats[i] == "") {
			if (!time_axis[i]) {
				dx = plots[i_plot].domains[i][1] - plots[i_plot].domains[i][0];
				
				for (j = 0; j < axis_tick_values[i].length - 1; j++) {
					this_dx = axis_tick_values[i][j+1] - axis_tick_values[i][j];
					if (this_dx < dx) {
						dx = this_dx;
					}
				}
				
				if (dx < 10) {
					dec_places = d3.precisionFixed(dx);
					tick_formats[i] = "." + dec_places + "f";
				} else {
					max_abs_value = plots[i_plot].domains[i][1];
					if (Math.abs(plots[i_plot].domains[i][0]) > Math.abs(max_abs_value)) {
						max_abs_value = Math.abs(plots[i_plot].domains[i][0]);
					}
					
					sig_figs = d3.precisionRound(dx, max_abs_value);
					tick_formats[i] = "." + sig_figs + "r";
				}
			} else {
				// Handled later on when the d3.timeFormat is called?
			}
		} else if (tick_formats[i] == "none") {
			tick_formats[i] = "";
		}
	}
	
	plots[i_plot].axis_ticks = [];
	var tick_vertices = [];
	var tick_geom, vertex1, vertex2, i2, i3;
	
	var tick_locations = [];
	
	tick_geom = [];
	var signs = [-1, 1];
	
	var axis_ct;
	
	for (i = 0; i < 3; i++) {
		tick_locations.push([]);
		tick_geom.push([new THREE.Geometry(), new THREE.Geometry(), new THREE.Geometry(), new THREE.Geometry()]);
		plots[i_plot].axis_ticks.push([]);
		
		i2 = (i + 1) % 3;
		i3 = (i2 + 1) % 3;
		
		for (j = 0; j < axis_tick_values[i].length; j++) {
			axis_ct = 0;
			
			for (k = 0; k < 2; k++) {
				for (l = 0; l < 2; l++) {
					vertex1 = new THREE.Vector3(0, 0, 0);
					vertex1[axes[i]] = plots[i_plot].scales[i](axis_tick_values[i][j]);
					vertex1[axes[i2]] = signs[k] * axis_scale_factor[i2];
					vertex1[axes[i3]] = signs[l] * axis_scale_factor[i3];
					
					vertex2 = new THREE.Vector3(tick_lengths[i], tick_lengths[i], tick_lengths[i]);
					vertex2[axes[i]] = 0;
					vertex2[axes[i2]] *= signs[k];
					vertex2[axes[i3]] *= signs[l];
					vertex2.add(vertex1);
					
					tick_geom[i][axis_ct].vertices.push(vertex1);
					tick_geom[i][axis_ct].vertices.push(vertex2);
					
					axis_ct++;
				}
			}
			
			tick_locations[i][j] = vertex1[axes[i]];
		}
		
		for (j = 0; j < 4; j++) {
			plots[i_plot].axis_ticks[i].push(new THREE.LineSegments(tick_geom[i][j], line_material));
		}
	}
	
	if (plots[i_plot].show_ticks) {
		plots[i_plot].scene.add(plots[i_plot].axis_ticks[0][0]);
		plots[i_plot].scene.add(plots[i_plot].axis_ticks[1][0]);
		plots[i_plot].scene.add(plots[i_plot].axis_ticks[2][0]);
	}
	
	
	// Gridlines.
	var grid_color = (params.hasOwnProperty("grid_color")) ? params.grid_color : 0x808080;
	if (typeof(grid_color) == "string") {
		grid_color = css_color_to_hex(grid_color, tiny_div);
	}
	
	plots[i_plot].bounding_planes = [axis_scale_factor[0], axis_scale_factor[1], axis_scale_factor[2]];
	
	var grid_material = new THREE.LineBasicMaterial({"color": grid_color});
	
	if (!(plots[i_plot].hasOwnProperty("show_grid"))) {
		plots[i_plot].show_grid = (params.hasOwnProperty("show_grid")) ? params.show_grid : true;
	}
	
	plots[i_plot].grid_lines_upper = [];
	plots[i_plot].grid_lines_lower = [];
	var grid_geom_lower, grid_geom_upper;
	var tick_ct;
	
	for (i = 0; i < 3; i++) {
		grid_geom_lower = new THREE.Geometry();
		grid_geom_upper = new THREE.Geometry();
		
		// Want to draw lines on the planes parallel
		// to axis[i] == const.
		
		for (j = 0; j < 3; j++) {
			if (j != i) {
				k = (~(i | j)) & 3;
				
				for (tick_ct = 0; tick_ct < axis_tick_values[j].length; tick_ct++) {
					// Lower plane:
					vertex1 = new THREE.Vector3();
					vertex1[axes[i]] = -axis_scale_factor[i];
					vertex1[axes[k]] = -axis_scale_factor[k];
					vertex1[axes[j]] = tick_locations[j][tick_ct];
					
					vertex2 = new THREE.Vector3();
					vertex2[axes[i]] = -axis_scale_factor[i];
					vertex2[axes[k]] = axis_scale_factor[k];
					vertex2[axes[j]] = tick_locations[j][tick_ct];
					
					grid_geom_lower.vertices.push(vertex1);
					grid_geom_lower.vertices.push(vertex2);
					
					// Upper plane:
					vertex1 = new THREE.Vector3();
					vertex1[axes[i]] = axis_scale_factor[i];
					vertex1[axes[k]] = -axis_scale_factor[k];
					vertex1[axes[j]] = tick_locations[j][tick_ct];
					
					vertex2 = new THREE.Vector3();
					vertex2[axes[i]] = axis_scale_factor[i];
					vertex2[axes[k]] = axis_scale_factor[k];
					vertex2[axes[j]] = tick_locations[j][tick_ct];
					
					grid_geom_upper.vertices.push(vertex1);
					grid_geom_upper.vertices.push(vertex2);
				}
			}
		}
		
		plots[i_plot].grid_lines_upper.push(new THREE.LineSegments(grid_geom_upper, grid_material));
		plots[i_plot].grid_lines_lower.push(new THREE.LineSegments(grid_geom_lower, grid_material));
	}
	
	plots[i_plot].showing_upper_grid = [false, false, false];
	plots[i_plot].showing_lower_grid = [false, false, false];
	
	if (plots[i_plot].show_grid) {
		update_gridlines(i_plot);
	}
	
	// Axis tick values.
	
	var tick_font_size;
	if (params.hasOwnProperty("tick_font_size")) {
		tick_font_size = params.tick_font_size;
	} else {
		if (!plots[i_plot].hasOwnProperty("tick_font_size")) {
			tick_font_size = 28;
		} else {
			tick_font_size = plots[i_plot].tick_font_size;
		}
	}
	plots[i_plot].tick_font_size = tick_font_size;
	
	// In case we're on orthographic camera and the perspective fov hasn't updated:
	if (plots[i_plot].view_type == "orthographic") {
		plots[i_plot].persp_camera.fov = Math.atan2(plots[i_plot].ortho_camera.top, plots[i_plot].camera_distance_scale) * rad2deg * 2;
	}
	
	var init_scale = 2 * tick_font_size * plots[i_plot].camera_distance_scale * Math.tan(0.5*plots[i_plot].persp_camera.fov / rad2deg) / plots[i_plot].height;
	
	
	var axis_tick_gaps = [0.1, 0.1, 0.1];
	if (params.hasOwnProperty("axis_tick_gaps")) {
		axis_tick_gaps = JSON.parse(JSON.stringify(params.axis_tick_gaps));
	} else {
		if (plots[i_plot].hasOwnProperty("axis_tick_gaps")) {
			axis_tick_gaps = JSON.parse(JSON.stringify(plots[i_plot].axis_tick_gaps));
		}
	}
	plots[i_plot].axis_tick_gaps = JSON.parse(JSON.stringify(axis_tick_gaps));
	
	if (!(plots[i_plot].hasOwnProperty("init_tick_scale"))) {
		// If we're changing data, we may already have this scale set,
		// and it would get updated to the wrong fov.
		plots[i_plot].init_tick_scale = init_scale;
	}
	
	var tick_font_color;
	if (params.hasOwnProperty("tick_font_color")) {
		if (typeof(params.axis_font_color) == "number") {
			tick_font_color = hex_to_css_color(params.tick_font_color);
		} else {
			tick_font_color = params.tick_font_color;
		}
	} else {
		if (!plots[i_plot].hasOwnProperty("tick_font_color")) {
			tick_font_color = "#FFFFFF";
		} else {
			tick_font_color = plots[i_plot].tick_font_color;
		}
	}
	plots[i_plot].tick_font_color = tick_font_color;
	
	var d3_formatter;
	var tick_ct = 0;
	plots[i_plot].tick_text_planes = [];
	plots[i_plot].num_ticks = [];
	
	var font;
	if (params.hasOwnProperty("font")) {
		font = params.font;
	} else {
		if (!plots[i_plot].hasOwnProperty("font")) {
			font = "Arial, sans-serif";
		} else {
			font = plots[i_plot].font;
		}
	}
	plots[i_plot].font = font;
	
	var bg_color;
	if (params.hasOwnProperty("background_color")) {
		bg_color = params.background_color;
	} else {
		if (!plots[i_plot].hasOwnProperty("background_color")) {
			bg_color = "#000000";
		} else {
			bg_color = plots[i_plot].background_color;
		}
	}
	plots[i_plot].background_color = bg_color;
	
	var bg_color_hex;
	
	if (typeof(bg_color) == "string") {
		bg_color_hex = css_color_to_hex(bg_color, tiny_div);
	} else {
		bg_color_hex = bg_color;
		bg_color = hex_to_css_color(bg_color);
	}
	
	for (i = 0; i < 3; i++) {
		plots[i_plot].num_ticks.push(axis_tick_values[i].length);
		
		if (time_axis[i]) {
			if (tick_formats[i] == "") {
				d3_formatter = plots[i_plot].scales[i].tickFormat(plots[i_plot].num_ticks[i]);
			} else {
				d3_formatter = d3.timeFormat(tick_formats[i]);
			}
		} else {
			d3_formatter = d3.format(tick_formats[i]);
		}
		
		for (j = 0; j < axis_tick_values[i].length; j++) {
			plots[i_plot].tick_text_planes.push(make_text_plane(d3_formatter(axis_tick_values[i][j]), font, tick_font_size, tick_font_color, bg_color, true, i_plot));
			
			for (k = 0; k < 3; k++) {
				if (i == k) {
					plots[i_plot].tick_text_planes[tick_ct].position[axes[k]] = tick_locations[i][j];
				} else {
					plots[i_plot].tick_text_planes[tick_ct].position[axes[k]] = -axis_scale_factor[k] - axis_tick_gaps[k];
				}
				
			}
			
			plots[i_plot].tick_text_planes[tick_ct].rotation.copy(get_current_camera(i_plot).rotation);
			plots[i_plot].tick_text_planes[tick_ct].scale.set(init_scale, init_scale, 1);
			
			if (plots[i_plot].show_ticks) {
				plots[i_plot].scene.add(plots[i_plot].tick_text_planes[tick_ct]);
			}
			
			tick_ct++;
		}
	}
	
	if (!(plots[i_plot].hasOwnProperty("show_axis_titles"))) {
		plots[i_plot].show_axis_titles = (params.hasOwnProperty("show_axis_titles")) ? JSON.parse(JSON.stringify(params.show_axis_titles)) : true;
	}
	
	var axis_titles = (params.hasOwnProperty("axis_titles")) ? JSON.parse(JSON.stringify(params.axis_titles)) : ["x", "y", "z"];
	
	var axis_title_gaps = [0.3, 0.3, 0.3];
	if (params.hasOwnProperty("axis_title_gaps")) {
		axis_title_gaps = JSON.parse(JSON.stringify(params.axis_title_gaps));
	} else {
		if (plots[i_plot].hasOwnProperty("axis_title_gaps")) {
			axis_title_gaps = JSON.parse(JSON.stringify(plots[i_plot].axis_title_gaps));
		}
	}
	plots[i_plot].axis_title_gaps = JSON.parse(JSON.stringify(axis_title_gaps));
	
	var axis_font_color;
	if (params.hasOwnProperty("axis_font_color")) {
		axis_font_color = params.axis_font_color;
	} else {
		if (!plots[i_plot].hasOwnProperty("axis_font_color")) {
			axis_font_color = "#FFFFFF";
		} else {
			axis_font_color = plots[i_plot].axis_font_color;
		}
	}
	
	if (typeof(axis_font_color) == "number") {
		axis_font_color = hex_to_css_color(params.axis_font_color);
	}
	
	plots[i_plot].axis_font_color = axis_font_color;
	
	
	plots[i_plot].axis_text_planes = [];
	
	
	
	var axis_font_size;
	if (params.hasOwnProperty("axis_font_size")) {
		axis_font_size = params.axis_font_size;
	} else {
		if (!plots[i_plot].hasOwnProperty("axis_font_size")) {
			axis_font_size = 30;
		} else {
			axis_font_size = plots[i_plot].axis_font_size;
		}
	}
	plots[i_plot].axis_font_size = axis_font_size;
	
	init_scale = 2 * axis_font_size * plots[i_plot].camera_distance_scale * Math.tan(0.5 * plots[i_plot].persp_camera.fov / rad2deg) / plots[i_plot].height;
	
	if (!(plots[i_plot].hasOwnProperty("init_axis_title_scale"))) {
		// If we're changing data, we may already have this scale set,
		// and it would get updated to the wrong fov.
		plots[i_plot].init_axis_title_scale = init_scale;
	}
	
	for (i = 0; i < 3; i++) {
		plots[i_plot].axis_text_planes.push(make_text_plane(axis_titles[i], font, axis_font_size, axis_font_color, bg_color, true, i_plot));
		
		for (j = 0; j < 3; j++) {
			if (i == j) {
				plots[i_plot].axis_text_planes[i].position[axes[j]] = 0;
			} else {
				plots[i_plot].axis_text_planes[i].position[axes[j]] = -axis_scale_factor[j] - axis_title_gaps[i];
			}
		}
		
		plots[i_plot].axis_text_planes[i].rotation.copy(get_current_camera(i_plot).rotation);
		plots[i_plot].axis_text_planes[i].scale.set(init_scale, init_scale, 1);
		
		if (plots[i_plot].show_axis_titles) {
			plots[i_plot].scene.add(plots[i_plot].axis_text_planes[i]);
		}
	}
	
	if (!(plots[i_plot].hasOwnProperty("dynamic_axis_labels"))) {
		plots[i_plot].dynamic_axis_labels = (params.hasOwnProperty("dynamic_axis_labels")) ? params.dynamic_axis_labels : false;
	}
	
	if (plots[i_plot].dynamic_axis_labels) {
		update_axes(i_plot);
	}
	
	plots[i_plot].parent_div.removeChild(tiny_div);
}

var calculate_locations = function(i_plot, params, ignore_surface_colors) {
	if (ignore_surface_colors === undefined) { ignore_surface_colors = false; }
	
	var return_object = {};
	return_object.null_points = [];
	
	var this_loc, this_size, group, i, j;
	var axes = ["x", "y", "z"];
	
	if (plots[i_plot].plot_type == "scatter") {
		return_object.plot_locations = [];
		
		var use_default = false;
		
		for (i = 0; i < params.data.length; i++) {
			return_object.plot_locations.push([]);
			return_object.null_points.push(0);
			
			for (j = 0; j < 3; j++) {
				return_object.plot_locations[i].push(plots[i_plot].scales[j](params.data[i][axes[j]]));
				
				if (isNaN(return_object.plot_locations[i][j]) || (params.data[i][axes[j]] === null)) {
					return_object.plot_locations[i][j] = 0;
					return_object.null_points[i] = 1;
				}
			}
			
			if (plots[i_plot].have_any_sizes) {
				if ((params.data[i].size === null) || (isNaN(params.data[i].size))) {
					use_default = true;
				} else {
					if (plots[i_plot].size_exponent != 0) {
						this_size = plots[i_plot].scales[3](params.data[i].scaled_size);
					} else {
						use_default = true;
					}
				}
			} else {
				use_default = true;
			}
			
			if (use_default) {
				if (plots[i_plot].have_groups) {
					group = params.data[i].group;
				} else {
					group = "default_group";
				}
				
				this_size = plots[i_plot].groups[group].default_point_height;
			}
			
			return_object.plot_locations[i].push(this_size);
		}
	} else if (plots[i_plot].plot_type == "surface") {
		return_object.plot_locations = {"x": [], "y": [], "z": [], "color": []};
		var this_color;
		
		for (i = 0; i < 2; i++) {
			// x and y.
			
			for (j = 0; j < params.data[axes[i]].length; j++) {
				return_object.plot_locations[axes[i]].push(plots[i_plot].scales[i](params.data[axes[i]][j]));
			}
		}
		
		// z.
		for (i = 0; i < params.data.z.length; i++) {
			return_object.plot_locations.z.push([]);
			return_object.null_points.push([]);
			
			for (j = 0; j < params.data.z[i].length; j++) {
				return_object.null_points[i].push(0);
				return_object.plot_locations.z[i].push(plots[i_plot].scales[2](params.data.z[i][j]));
				
				if (isNaN(return_object.plot_locations.z[i][j]) || (params.data.z[i][j] === null)) {
					return_object.plot_locations.z[i][j] = 0;
					return_object.null_points[i][j] = 1;
				}
			}
		}
		
		if (!plots[i_plot].hasOwnProperty("color_fn")) {
			if (!params.hasOwnProperty("color_scale")) {
				plots[i_plot].color_fn = colorscale_viridis;
			} else {
				set_surface_color_scale_fn(i_plot, params.color_scale);
			}
		}
		
		if (plots[i_plot].have_color_matrix) {
			var tiny_div = document.createElement("div");
			tiny_div.style.width = "1px";
			tiny_div.style.height = "1px";
			plots[i_plot].parent_div.appendChild(tiny_div);
			
			if (ignore_surface_colors) {
				for (i = 0; i < plots[i_plot].mesh_points.length; i++) {
					return_object.plot_locations.color.push([]);
					
					for (j = 0; j < plots[i_plot].mesh_points[i].length; j++) {
						return_object.plot_locations.color[i].push([0, 0, 0]);
					}
				}
			} else {
				for (i = 0; i < params.data.color.length; i++) {
					return_object.plot_locations.color.push([]);
					
					for (j = 0; j < params.data.color[i].length; j++) {
						this_color = params.data.color[i][j];
						
						if (typeof(this_color) == "string") {
							this_color = css_color_to_hex(this_color, tiny_div);
							params.data.color[i][j] = this_color;
						}
						
						this_color = hex_to_rgb_obj(this_color);
						return_object.plot_locations.color[i].push([this_color.r, this_color.g, this_color.b]);
					}
				}
			}
			
			plots[i_plot].parent_div.removeChild(tiny_div);
		} else {
			params.data.color = [];
			var this_color, this_color_num;
			
			for (i = 0; i < params.data.z.length; i++) {
				return_object.plot_locations.color.push([]);
				params.data.color.push([]);
				
				for (j = 0; j < params.data.z[i].length; j++) {
					if (return_object.null_points[i][j]) {
						this_color = [0, 0, 0];
						this_color_num = 0;
					} else {
						this_color = calculate_color(params.data.z[i][j], plots[i_plot].color_domain, plots[i_plot].color_fn);
						this_color_num = 65536*Math.round(255*this_color[0]) + 256*Math.round(255*this_color[1]) + Math.round(255*this_color[2]);
					}
					
					return_object.plot_locations.color[i].push(this_color.slice(0));
					params.data.color[i].push(this_color_num);
				}
			}
		}
	}
	
	return return_object;
}

var make_mesh_points = function(i_plot, params, plot_locations, null_points) {
	var i, j;
	var nx = plot_locations.x.length;
	var ny = plot_locations.y.length;
	
	var surface_geom = new THREE.BufferGeometry();
	var mesh_geom    = new THREE.BufferGeometry();
	
	var array_obj = make_mesh_arrays(i_plot, params, plot_locations, null_points);
	
	surface_geom.addAttribute("position",   new THREE.BufferAttribute(array_obj.surface_positions, 3, true));
	surface_geom.addAttribute("color",      new THREE.BufferAttribute(array_obj.surface_colors,    4, true));
	surface_geom.addAttribute("null_point", new THREE.BufferAttribute(array_obj.surface_nulls,     1, true));
	surface_geom.addAttribute("hide_point", new THREE.BufferAttribute(array_obj.surface_hides,     1, true));
	
	plots[i_plot].surface = new THREE.Mesh(surface_geom, plots[i_plot].surface_material);
	
	if (!plots[i_plot].hasOwnProperty("showing_surface")) {
		plots[i_plot].showing_surface = (params.hasOwnProperty("show_surface")) ? params.show_surface : true;
	}
	
	if (plots[i_plot].showing_surface) { plots[i_plot].scene.add(plots[i_plot].surface); }
	
	mesh_geom.addAttribute("position",   new THREE.BufferAttribute(array_obj.mesh_positions, 3, true));
	mesh_geom.addAttribute("color",      new THREE.BufferAttribute(array_obj.mesh_colors,    4, true));
	mesh_geom.addAttribute("null_point", new THREE.BufferAttribute(array_obj.mesh_nulls,     1, true));
	mesh_geom.addAttribute("hide_point", new THREE.BufferAttribute(array_obj.mesh_hides,     1, true));
	mesh_geom.addAttribute("hide_axis",  new THREE.BufferAttribute(array_obj.mesh_hide_axes, 1, true));
	
	plots[i_plot].surface_mesh = new THREE.LineSegments(mesh_geom, plots[i_plot].mesh_material);
	
	if (!plots[i_plot].hasOwnProperty("showing_mesh")) {
		plots[i_plot].showing_mesh = (params.hasOwnProperty("show_mesh")) ? params.show_mesh : true;
	}
	
	if (plots[i_plot].showing_mesh) { plots[i_plot].scene.add(plots[i_plot].surface_mesh); }
	
	plots[i_plot].mesh_points = [];
	plots[i_plot].hide_points = [];
	plots[i_plot].hide_mesh_points = [];
	
	// Update input data.
	for (i = 0; i < nx; i++) {
		plots[i_plot].mesh_points.push([]);
		plots[i_plot].hide_points.push([]);
		plots[i_plot].hide_mesh_points.push([]);
		
		for (j = 0; j < ny; j++) {
			plots[i_plot].mesh_points[i].push({"input_data": {}});
			if (plots[i_plot].have_other) {
				plots[i_plot].mesh_points[i][j].input_data.other = JSON.parse(JSON.stringify(params.data.other[i][j]));
			} else {
				plots[i_plot].mesh_points[i][j].input_data.other = {};
			}
			
			plots[i_plot].hide_points[i].push(0);
			plots[i_plot].hide_mesh_points[i].push(0);
		}
	}
	
	update_surface_input_data(i_plot, params, array_obj.start_i, array_obj.start_j);
}

var custom_plot_listeners = function(i_plot, params) {
	plots[i_plot].have_mouseover = false;
	plots[i_plot].have_mouseout = false;
	plots[i_plot].have_click = false;
	
	if (plots[i_plot].plot_type == "scatter") {
		plots[i_plot].clicked_i = -1;
		plots[i_plot].mouseover_i = -1;
	} else if (plots[i_plot].plot_type == "surface") {
		plots[i_plot].clicked_i = [-1, -1];
		plots[i_plot].mouseover_i = [-1, -1];
	}
	
	var possible_events = true;
	if (plots[i_plot].plot_type == "scatter") {
		if (plots[i_plot].geom_type == "none") {
			possible_events = false;
		}
	}
	
	if (possible_events) {
		if (params.hasOwnProperty("mouseover")) {
			plots[i_plot].have_mouseover = true;
			plots[i_plot].mouseover = params.mouseover;
		}
		
		if (params.hasOwnProperty("mouseout")) {
			plots[i_plot].have_mouseout = true;
			plots[i_plot].mouseout = params.mouseout;
		}
		
		if (params.hasOwnProperty("click")) {
			plots[i_plot].have_click = true;
			plots[i_plot].click = params.click;
		}
	}
}

var update_render = function(i_plot) {
	plots[i_plot].renderer.render(plots[i_plot].scene, get_current_camera(i_plot));
}

var basic_plot_listeners = function(i_plot, params) {
	plots[i_plot].mouse_operation = "none";
	plots[i_plot].two_finger_operation = "none";
	
	plots[i_plot].renderer.domElement.addEventListener("mousedown", mouse_down_fn(i_plot));
	plots[i_plot].renderer.domElement.addEventListener("mouseup", mouse_up_fn(i_plot, false));
	plots[i_plot].renderer.domElement.addEventListener("mouseout", mouse_up_fn(i_plot, true));
	
	if (plots[i_plot].have_mouseout) {
		if (plots[i_plot].plot_type == "scatter") {
			plots[i_plot].renderer.domElement.addEventListener("mouseout", mouse_out_wrapper(i_plot, -1, true));
		} else if (plots[i_plot].plot_type == "surface") {
			plots[i_plot].renderer.domElement.addEventListener("mouseout", mouse_out_wrapper(i_plot, [-1, -1], true));
		}
	}
	
	
	plots[i_plot].renderer.domElement.addEventListener("mousemove", mouse_move_wrapper(i_plot));
	plots[i_plot].renderer.domElement.addEventListener("wheel", mouse_zoom_wrapper(i_plot));
	plots[i_plot].renderer.domElement.addEventListener("touchstart", touch_start_fn(i_plot));
	plots[i_plot].renderer.domElement.addEventListener("touchmove", touch_move_fn(i_plot));
	plots[i_plot].renderer.domElement.addEventListener("touchend", touch_end_fn(i_plot));
	
	if (plots[i_plot].make_toggles) {
		document.getElementById("icon_three_d_scatter_camera_" + i_plot).addEventListener("click", toggle_camera(i_plot));
		document.getElementById("icon_three_d_scatter_grid_" + i_plot).addEventListener("click", toggle_grid(i_plot));
		document.getElementById("icon_three_d_scatter_ticks_" + i_plot).addEventListener("click", toggle_ticks(i_plot));
		document.getElementById("icon_three_d_scatter_axis_title_" + i_plot).addEventListener("click", toggle_axis_titles(i_plot));
		document.getElementById("icon_three_d_scatter_box_" + i_plot).addEventListener("click", toggle_box(i_plot));
	}
	
	if (plots[i_plot].make_snaps) {
		document.getElementById("icon_three_d_scatter_snap_home_" + i_plot).addEventListener("click",
			reset_camera_wrapper(
				i_plot,
				false,
				[plots[i_plot].init_lonlat[0], plots[i_plot].init_lonlat[1], plots[i_plot].init_rot],
				plots[i_plot].init_origin));
		
		document.getElementById("icon_three_d_scatter_snap_top_" + i_plot).addEventListener("click",
			reset_camera_wrapper(
				i_plot,
				false,
				[0, tau/4, -tau/4],
				[0, 0, 0]));
		
		document.getElementById("icon_three_d_scatter_snap_bottom_" + i_plot).addEventListener("click",
			reset_camera_wrapper(
				i_plot,
				false,
				[0, -tau/4, -tau/4],
				[0, 0, 0]));
		
		document.getElementById("icon_three_d_scatter_snap_front_" + i_plot).addEventListener("click",
			reset_camera_wrapper(
				i_plot,
				false,
				[-tau/4, 0, 0],
				[0, 0, 0]));
		
		document.getElementById("icon_three_d_scatter_snap_back_" + i_plot).addEventListener("click",
			reset_camera_wrapper(
				i_plot,
				false,
				[tau/4, 0, 0],
				[0, 0, 0]));
		
		document.getElementById("icon_three_d_scatter_snap_left_" + i_plot).addEventListener("click",
			reset_camera_wrapper(
				i_plot,
				false,
				[0, 0, 0],
				[0, 0, 0]));
		
		document.getElementById("icon_three_d_scatter_snap_right_" + i_plot).addEventListener("click",
			reset_camera_wrapper(
				i_plot,
				false,
				[tau/2, 0, 0],
				[0, 0, 0]));
	}
}

var css_color_to_hex = function(css, dummy) {
	// css a string; dummy an element of the DOM to colour.
	var remove_dummy = false;
	
	if (dummy === undefined) {
		var body = document.getElementsByTagName("body")[0];
		dummy = document.createElement("div");
		dummy.style.width = "1px";
		dummy.style.height = "1px";
		remove_dummy = true;
	}
	
	dummy.style.backgroundColor = css;
	
	if (remove_dummy) { body.appendChild(dummy); }
	
	var rgb = window.getComputedStyle(dummy).backgroundColor;
	
	if (remove_dummy) { body.removeChild(dummy); }
	
	rgb = rgb.replace(/rgb\(/, "");
	rgb = rgb.replace(/\)/, "");
	rgb = rgb.replace(/ /g, "");
	
	var reg = /([0-9]+)\,([0-9]+)\,([0-9]+)/g;
	rgb = reg.exec(rgb);
	
	return (parseInt(rgb[1]) << 16) + (parseInt(rgb[2]) << 8) + parseInt(rgb[3]);
}

var make_surface = function(params) {
    if (!check_webgl_fallback(params)) { return; }

    var size_checks = check_surface_data_sizes(params);
    if (!size_checks.data) { return; }

    if ((params.data.x.length < 2) || (params.data.y.length < 2)) {
        console.warn("Need to have at least two values defined for each of x and y.");
        return;
    }

    plots.push({});
    var i_plot = plots.length - 1;

    plots[i_plot].plot_type = "surface";
    plots[i_plot].parent_div = document.getElementById(params.div_id);
    plots[i_plot].have_color_matrix = size_checks.colors;
    plots[i_plot].have_other = size_checks.other;

    basic_plot_setup(i_plot, params);
    make_axes(i_plot, params);

    plots[i_plot].surface_material = new THREE.ShaderMaterial({
        "vertexShader":   shader_surface_vertex,
        "fragmentShader": shader_surface_fragment,
        "side": THREE.DoubleSide
    });

    var mesh_color;

    if (params.hasOwnProperty("mesh_color")) {
        mesh_color = params.mesh_color;
        
        if (typeof(mesh_color) == "string") {
            mesh_color = css_color_to_hex(mesh_color);
        }
        
        var rgb = hex_to_rgb_obj(mesh_color);
        mesh_color = new THREE.Vector4(rgb.r, rgb.g, rgb.b, 1.0);
    } else {
        // Set default mesh colour to black or white depending
        // on the background colour.
        var bg_color_obj = hex_to_rgb_obj(plots[i_plot].bg_color_hex);
        var sum_bg = bg_color_obj.r + bg_color_obj.g + bg_color_obj.b;
        if (sum_bg > 1.5) {
            mesh_color = new THREE.Vector4(0, 0, 0, 1);
        } else {
            mesh_color = new THREE.Vector4(1, 1, 1, 1);
        }
    }

    var use_const_color = 1;

    if (params.hasOwnProperty("uniform_mesh_color")) {
        use_const_color = params.uniform_mesh_color | 0;
    }

    plots[i_plot].mesh_material = new THREE.ShaderMaterial({
        "uniforms": {
            "use_const_color": {"type": "f",  "value": use_const_color},
            "const_color":     {"type": "v4", "value": mesh_color}
        },
        "vertexShader":   shader_mesh_vertex,
        "fragmentShader": shader_mesh_fragment
    });

    var temp_obj = calculate_locations(i_plot, params);
    make_mesh_points(i_plot, params, temp_obj.plot_locations, temp_obj.null_points);

    custom_plot_listeners(i_plot, params);
    update_render(i_plot);
    plots[i_plot].tried_initial_render = true;

    basic_plot_listeners(i_plot, params);
}


function init_plot() {
    var params = {};
    
    // (If you have more than one plot on a page, then you'll need a
    // different div_id for the second plot.)
    params.div_id = "div_plot_area";
    
    params.data = {};
    
    // A grid with 6 values along x, 4 values along y:
    params.data.x = [5, 6, 7, 8, 9, 10];
    params.data.y = [0, 0.5, 1, 1.5];
    
    // z array has length 6, each entry an array of length 4:
    params.data.z = [
      [10, 11, 9.5, 10],
      [10, 12, 11,  8],
      [11, 13, 11,  9],
      [10, 15, 12,  9],
      [11, 14, 11, 10],
      [11, 10, 10,  9]
    ];
    
    make_surface(params);
}
  
init_plot();