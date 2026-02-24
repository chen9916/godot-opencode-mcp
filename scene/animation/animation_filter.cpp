/**************************************************************************/
/*  animation_filter.cpp                                                  */
/**************************************************************************/
/*                         This file is part of:                          */
/*                             GODOT ENGINE                               */
/*                        https://godotengine.org                         */
/**************************************************************************/
/* Copyright (c) 2014-present Godot Engine contributors (see AUTHORS.md). */
/* Copyright (c) 2007-2014 Juan Linietsky, Ariel Manzur.                  */
/*                                                                        */
/* Permission is hereby granted, free of charge, to any person obtaining  */
/* a copy of this software and associated documentation files (the        */
/* "Software"), to deal in the Software without restriction, including    */
/* without limitation the rights to use, copy, modify, merge, publish,    */
/* distribute, sublicense, and/or sell copies of the Software, and to     */
/* permit persons to whom the Software is furnished to do so, subject to  */
/* the following conditions:                                              */
/*                                                                        */
/* The above copyright notice and this permission notice shall be         */
/* included in all copies or substantial portions of the Software.        */
/*                                                                        */
/* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,        */
/* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF     */
/* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. */
/* IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY   */
/* CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,   */
/* TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE      */
/* SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                 */
/**************************************************************************/

#include "animation_filter.h"

void AnimationFilter::add_path(const NodePath &p_path) {
	if (filtered_paths.has(p_path)) {
		return;
	}
	filtered_paths[p_path] = true;
	emit_changed();
}

void AnimationFilter::remove_path(const NodePath &p_path) {
	if (!filtered_paths.has(p_path)) {
		return;
	}
	filtered_paths.erase(p_path);
	emit_changed();
}

bool AnimationFilter::has_path(const NodePath &p_path) const {
	return filtered_paths.has(p_path);
}

TypedArray<NodePath> AnimationFilter::get_paths() const {
	TypedArray<NodePath> paths;
	for (const KeyValue<NodePath, bool> &E : filtered_paths) {
		paths.push_back(E.key);
	}
	return paths;
}

void AnimationFilter::clear() {
	if (filtered_paths.is_empty()) {
		return;
	}
	filtered_paths.clear();
	emit_changed();
}

Array AnimationFilter::_get_paths_for_serialization() const {
	Array paths;
	for (const KeyValue<NodePath, bool> &E : filtered_paths) {
		paths.push_back(String(E.key));
	}
	paths.sort();
	return paths;
}

void AnimationFilter::_set_paths_from_serialization(const Array &p_paths) {
	filtered_paths.clear();
	for (int i = 0; i < p_paths.size(); i++) {
		NodePath np = p_paths[i];
		filtered_paths[np] = true;
	}
}

void AnimationFilter::_bind_methods() {
	ClassDB::bind_method(D_METHOD("add_path", "path"), &AnimationFilter::add_path);
	ClassDB::bind_method(D_METHOD("remove_path", "path"), &AnimationFilter::remove_path);
	ClassDB::bind_method(D_METHOD("has_path", "path"), &AnimationFilter::has_path);
	ClassDB::bind_method(D_METHOD("get_paths"), &AnimationFilter::get_paths);
	ClassDB::bind_method(D_METHOD("clear"), &AnimationFilter::clear);

	ClassDB::bind_method(D_METHOD("_get_paths_for_serialization"), &AnimationFilter::_get_paths_for_serialization);
	ClassDB::bind_method(D_METHOD("_set_paths_from_serialization", "paths"), &AnimationFilter::_set_paths_from_serialization);

	ADD_PROPERTY(PropertyInfo(Variant::ARRAY, "paths", PROPERTY_HINT_NONE, "", PROPERTY_USAGE_STORAGE | PROPERTY_USAGE_NO_EDITOR), "_set_paths_from_serialization", "_get_paths_for_serialization");
}

AnimationFilter::AnimationFilter() {}
