# Electron 

 See [Electron开发实战](https://segmentfault.com/a/1190000014209821) 


## 打包应用程序
接下来就是打包应用程序了，以便分发应用，在其他机器上安装使用。这里我们使用第三方打包工具来做这项工作。

通常有三种打包工具可供选择：
* [electron-forge](https://github.com/electron-userland/electron-forge)
* [lectron-builder](https://github.com/electron-userland/electron-builder)
* [electron-packager](https://github.com/electron/electron-packager)
## 生成分发安装包

有很多工具可供选择，用于将打包好的应用生成分发安装包，以便于在其他机器下载安装。 
* [electron-installer-zip](https://github.com/mongodb-js/electron-installer-zip) - creates symlink-compatible ZIP files

Windows:
* [electron-winstaller]() - Squirrel.Windows-based installer
* [electron-windows-store]() - creates an AppX package for the Windows Store
* [electron-wix-msi]() - creates traditional MSI installers

OS X:
* [electron-installer-dmg]() - creates a DMG

Linux:
* [electron-installer-debian]() - creates a DEB file
* [electron-installer-redhat]() - creates an RPM
* [electron-installer-flatpak]() - creates a Flatpak file
* [electron-installer-snap]() - creates a Snap file

