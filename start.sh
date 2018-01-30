#!/bin/bash
function jumpto
{
    label=$1
    cmd=$(sed -n "/$label:/{:a;n;p;ba};" $0 | grep -v ';$')
    eval "$cmd"
    exit
}

start=${1:-"start"}

jumpto $start

start:
echo "Starting bot..."
node bin/Boot
wait

clear
echo "Bot crashed or shutdown..."
echo "Rebooting..."

jumpto $start

end:
