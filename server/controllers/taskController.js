import prisma from "../configs/prisma.js";


// create a new task

export const createTask = async(req, res) => {
    try {
        const {userId} = await req.auth();
        const {projectId,  title, description, type, status, priority, assigneeId, due_date } = req.body;
        const origin = req.get('origin');

        // check if user has admin role for the project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { members: { include: {user: true}}}}
        });

        if(!project){
            return res.status(404).json({message: "Project not found"});
        }
         else if(project.team_lead !== userId){
            return res.status(403).json({message: "You do not have admin privileges"});
        }
         else if (assigneeId && !project.members.find((member) => member.user.id === assigneeId)) {
            return res.status(403).json({ message: "Assignee is not a member of the project" });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                type,
                status,
                priority,
                assigneeId,
                due_date : new Date(due_date),
                createdBy: userId
            }
        });

        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true }
        });

        res.json({ message: "Task created successfully", task: taskWithAssignee });




    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}