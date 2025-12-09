import { use } from "react";
import prisma from "../configs/prisma.js";





// Create project

export const createProject = async (req,res) => {
    try {
        const {userId} = await req.auth();
        const {workspaceId, description, name, status, start_date, end_date,team_members, team_lead, progress, priority} = req.body;

        //check if user has admin role for workspace
        const workspace = await prisma.workspace.findUnique({
            where: {id: workspaceId},
            include: {members: {include: {user:true}}}
        })

        if(!workspace){
            return res.status(404).json({message: "Workspace not found"})
        }

        if(!workspace.members.some((member)=> member.userId === userId && member.role === "ADMIN")){
             return res.status(403).json({message: "You dont have permission to create project in this workspace"});
           
        }

        // Get Team lead using email

        const teamLead = await prisma.user.findUnique({
            where: {email: team_lead},
            select: {id: true}
        })

        const project = await prisma.project.create({
            data: {
                workspaceId,
                name,
                description,
                status,
                priority,
                progress,
                team_lead: teamLead?.id,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        })




        // Add members to project if they are in the project
        if(team_members?.length>0){
            const memberToAdd = []
            workspace.members.forEach(member => {
                if(team_members.includes(member.user.email)){
                    memberToAdd.push(member.user.id)
                }
            })

            await prisma.projectMember.createMany({
                data: memberToAdd.map(memberId => ({
                    projectId: project.id,
                    userId: memberId
                }))
            })

        }

        const projectWithMembers = await prisma.project.findUnique({
            where: {id: project.id},
            include: {
                members: {include: {user:true}},
                task: {include: {assignees: true , comments: {includes: {user:true}}}},
                owner: true
            }
        })

        res.json({project: projectWithMembers , message: "Project created successfully"});


    } 
    
    catch (error) {
        console.log(error);
        res.status(500).json({message: error.code || error.message})
        
    }
}


// Update project

export const updateProject = async (req,res) => {
    try {

        const {userId} = await req.auth();
        const {id,workspaceId, description, name, status, start_date, end_date,team_members, team_lead, progress, priority} = req.body;

        //check if user has admin role for workspace
        const workspace = await prisma.workspace.findUnique({
            where: {id: workspaceId},
            include: {members: {include: {user:true}}}
        })

        if(!workspace){
            return res.status(404).json({message: "Workspace not found"})
        }

        if(!workspace.members.some((member)=> member.userId === userId && member.role === "ADMIN")){
             return res.status(403).json({message: "You dont have permission to update project in this workspace"});
        }

        if(!project){
            return res.status(404).json({message: "Project not found"})
        }
         else if(project.team_lead !== userId){
            return res.status(403).json({message: "You dont have permission to update this project"});
        }

        const project = await prisma.project.update({
            where: {id},
            data: {
                name,
                description,
                status,
                priority,
                progress,
                team_lead,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        })

        
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.code || error.message})
        
    }
}




//Add Member to project

export const addMember = async (req,res) => {
    try {
        const {userId} = await req.auth();
        const {projectId} = req.params;
        const {email} = req.body;

        const project = await prisma.project.findUnique({
            where: {id: projectId},
            include: {
                members: {include: {user:true}},
            }
        })

        if(!project){
            return res.status(404).json({message: "Project not found"})
        }

        if(project.team_lead !== userId){
            return res.status(404).json({message: "You dont have permission to add member to this project"});
        }

        // Check if user is already a member

        const existingMember = project.members.find(member => member.user.email === email);
        if(existingMember){
            return res.status(400).json({message: "User is already a member of this project"});
        }

        const user = await prisma.user.findUnique({
            where: {email}
        });

        if(!user){
            return res.status(404).json({message: "User not found"});
        }

        const member = await prisma.projectMember.create({
            data: {
                userId: user.id,
                projectId,  
            }
        });

        res.json({member, message: "Member added successfully"});



    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.code || error.message})
        
    }
}