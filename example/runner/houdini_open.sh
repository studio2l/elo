#!/bin/bash

export SITE_HOUDINI_PATH=$SITE_ROOT/global/houdini
export HOUDINI_PATH=$HOUDINI_PATH:$SITE_HOUDINI_PATH:&

houdini $1
