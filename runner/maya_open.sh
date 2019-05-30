#!/bin/bash

export SITE_MAYA_PATH=$SITE_ROOT/global/maya
export MAYA_PATH=$MAYA_PATH:$SITE_MAYA_PATH

maya $1
