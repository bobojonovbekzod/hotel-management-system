const { PrismaClient } = require('@prisma/client');
const { request } = require('urllib');

async function test() {
    const prisma = new PrismaClient();
    try {
        const device = await prisma.device.findFirst();
        if (!device) {
            console.log('No device found');
            return;
        }

        const auth = `${device.username}:${device.password}`;
        const baseUrl = `http://${device.ipAddress}:${device.port}/ISAPI`;
        
        console.log('Updating User 2...');
        try {
            const userRes = await request(`${baseUrl}/AccessControl/UserInfo/Modify?format=json`, {
                method: 'PUT',
                digestAuth: auth,
                content: JSON.stringify({
                    UserInfo: {
                        employeeNo: "2",
                        name: "Bekzod Bobojonov",
                        userType: "normal",
                        Valid: {
                            enable: true,
                            beginTime: "2000-01-01T00:00:00",
                            endTime: "2037-12-31T23:59:59"
                        },
                        doorRight: "1", // THIS MIGHT BE THE MISSING PIECE
                        RightPlan: [
                            {
                                doorNo: 1,
                                planTemplateNo: "1"
                            }
                        ]
                    }
                }),
                headers: { 'Content-Type': 'application/json' },
                dataType: 'json'
            });
            console.log('Update result:', JSON.stringify(userRes.data, null, 2));
        } catch (e) {
            console.log('Update error:', e.message);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
