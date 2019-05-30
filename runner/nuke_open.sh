#!/bin/bash

export SITE_NUKE_PATH=$SITE_ROOT/global/nuke
export NUKE_PATH=$NUKE_PATH:$SITE_NUKE_PATH

nuke --nukex $1
