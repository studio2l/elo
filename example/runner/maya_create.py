# coding: utf-8

import sys

from maya import standalone
from maya import cmds

args = sys.argv[1:]
if len(args) != 0:
	raise Error("scene file name not specified")
scene = args[0]

standalone.initialize(name='python')
cmds.file(rename=scene)
cmds.file(save=True)
