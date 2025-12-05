import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

// Ingest Function to save user data to a database

const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-from-clerk'},
    {event: 'clerk/user.created'},
    async ( event ) => {
       const {data} = event
       await prisma.user.create({
        data: {
            id : data.id,
            email: data?.email_addresses[0] ?.email_addres,
            name: data?.first_name + " " + data.last_name,
            image:data?.image_url, 
        }
       })
    }
)

// Inngest function to delete user from database
const syncUserDeletion = inngest.createFunction(
    {id: 'delete-user-with-clerk'},
    {event: 'clerk/user.deleted'},
    async ( event ) => {
       const {data} = event
       await prisma.user.delete({
        where: {
            id: data.id,
        }
       })
    }
)


// Create an empty array where we'll export future Inngest functions
export const functions = [];