#!/bin/bash

SCRIPT="# coding: utf-8
from maya import standalone
from maya import cmds

standalone.initialize(name='python')
cmds.file(rename='$1')
cmds.file(save=True)
"

mayapy -c $SCRIPT
