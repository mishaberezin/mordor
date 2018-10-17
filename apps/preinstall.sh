red=`tput setaf 1`
green=`tput setaf 2`
yellow=`tput setaf 3`
reset=`tput sgr0`

PreinstallInfo="${green}Preinstall info:"
PreinstallRun="${yellow}Preinstall run:"

echo "${PreinstallInfo} Check global libs"

unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     machine=Linux;;
    Darwin*)    machine=Mac;;
    *)          machine="UNKNOWN:${unameOut}"
esac
echo "${PreinstallInfo} Platform: ${machine}"

if [[ $machine == "Mac" ]]; then
    brewFormula="pkg-config cairo libpng jpeg giflib"
    brewListCommand="brew ls ${brewFormula}"
    echo "${PreinstallRun} ${brewListCommand}"
    brewList="$(${brewListCommand})"

    if [[ ${brewList} =~ "Error" ]]; then
        echo "${PreinstallInfo} Global libs already installed${reset}"
        exit 0
    else
        echo "${PreinstallInfo} Need to install brew packages:"
        brewInstallCommand="brew install ${brewFormula}"
        echo "${red}${brewInstallCommand}${reset}"
        # echo "$(${brewInstallCommand})"
        exit 1

    fi
    [[ ${brewList} =~ "Error.+" ]] && echo $BASH_REMATCH
else
    echo "Linux"
fi
