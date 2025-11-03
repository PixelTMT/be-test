import { PrismaClient, Roles } from '@prisma/client';
import bcrypt from 'bcrypt';
export async function seedAdmin(prisma:PrismaClient){
    const countAdmin = await prisma.user.count({where:{
        role:"ADMIN"
    }})

    if(countAdmin === 0) {
        const hashedPassword = await bcrypt.hash("admin123", 12)
    
        await prisma.user.create({
            data:{
                fullName:"Admin",
                password : hashedPassword,
                email:"admin@test.com",
                role :Roles.ADMIN
            }
        })
        
        console.log("Admin seeded")
    } else {
        console.log("Admin already seeded")
    }
}