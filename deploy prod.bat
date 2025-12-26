
cd client
call npm run build:production
cd ..
cd aws
echo y | call npm run deploy:production

pause