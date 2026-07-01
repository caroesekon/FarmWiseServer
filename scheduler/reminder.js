const Farm = require('../models/client/Farm');
const User = require('../models/client/User');
const Vaccination = require('../models/client/Vaccination');
const Breeding = require('../models/client/Breeding');
const Inventory = require('../models/client/Inventory');
const Equipment = require('../models/client/Equipment');
const Task = require('../models/client/Task');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const run = async () => {
  const farms = await Farm.find({ status: 'active' });

  logger.info(`[Reminder] Checking reminders for ${farms.length} farms`);

  for (const farm of farms) {
    try {
      const farmAdmin = await User.findOne({
        farmId: farm._id,
        role: 'farmAdmin',
        status: 'active',
      });

      if (!farmAdmin || !farmAdmin.email) continue;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const upcomingReminders = [];
      const finalReminders = [];

      const vaccinations = await Vaccination.find({
        farmId: farm._id,
        status: { $ne: 'completed' },
        dueDate: { $lte: threeDaysFromNow },
      });

      for (const vax of vaccinations) {
        const dueDate = new Date(vax.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilDue === 0) {
          finalReminders.push({
            type: 'vaccination',
            title: 'Vaccination Due Today',
            description: `${vax.vaccineName} — ${vax.animalCount} animal(s)`,
            dueDate: vax.dueDate,
            referenceId: vax._id,
          });
        } else if (daysUntilDue === 3) {
          upcomingReminders.push({
            type: 'vaccination',
            title: 'Vaccination Upcoming',
            description: `${vax.vaccineName} — ${vax.animalCount} animal(s) in 3 days`,
            dueDate: vax.dueDate,
            referenceId: vax._id,
          });
        }
      }

      const allVaccinations = await Vaccination.find({
        farmId: farm._id,
        status: { $ne: 'completed' },
        vetId: { $ne: null },
        dueDate: { $lte: sevenDaysFromNow },
      });

      for (const vax of allVaccinations) {
        const dueDate = new Date(vax.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilDue === 7 || daysUntilDue === 3 || daysUntilDue === 0) {
          const vet = await User.findById(vax.vetId);
          if (vet?.email) {
            const label = daysUntilDue === 0 ? 'TODAY' : `in ${daysUntilDue} days`;
            const template = daysUntilDue === 0 ? 'reminderFinal' : 'reminderUpcoming';

            await emailService.send({
              to: vet.email,
              template,
              data: {
                farmName: farm.name,
                reminders: [{
                  title: `Vaccination ${label}: ${vax.vaccineName}`,
                  description: `${vax.animalCount} animal(s) on ${farm.name}. ${vax.notes || ''}`,
                  dueDate: vax.dueDate,
                }],
                count: 1,
              },
            });
            logger.info(`[Reminder] Vet notified: ${vet.email} for ${vax.vaccineName} (${daysUntilDue}d)`);
          }
        }
      }

      const breedingEvents = await Breeding.find({
        farmId: farm._id,
        eventType: { $in: ['expectedHeat', 'pregnancyCheck', 'expectedCalving'] },
        status: 'pending',
        expectedDate: { $lte: threeDaysFromNow },
      });

      for (const event of breedingEvents) {
        const expectedDate = new Date(event.expectedDate);
        expectedDate.setHours(0, 0, 0, 0);

        const daysUntil = Math.ceil((expectedDate - today) / (1000 * 60 * 60 * 24));

        const eventLabel = {
          expectedHeat: 'Expected Heat',
          pregnancyCheck: 'Pregnancy Check Due',
          expectedCalving: 'Expected Calving',
        }[event.eventType];

        if (daysUntil === 0) {
          finalReminders.push({
            type: 'breeding',
            title: `${eventLabel} Today`,
            description: `Animal #${event.animalId} — ${eventLabel}`,
            dueDate: event.expectedDate,
            referenceId: event._id,
          });
        } else if (daysUntil === 3) {
          upcomingReminders.push({
            type: 'breeding',
            title: `${eventLabel} in 3 Days`,
            description: `Animal #${event.animalId} — prepare now`,
            dueDate: event.expectedDate,
            referenceId: event._id,
          });
        }
      }

      const inventoryItems = await Inventory.find({
        farmId: farm._id,
        status: 'active',
      });

      for (const item of inventoryItems) {
        if (item.currentStock <= item.reorderAt) {
          const daysRemaining = item.dailyConsumption > 0
            ? Math.floor(item.currentStock / item.dailyConsumption)
            : 0;

          if (daysRemaining <= 3) {
            const reminderItem = {
              type: 'inventory',
              title: daysRemaining === 0 ? 'Stock Depleted' : `Stock Running Out (${daysRemaining} days)`,
              description: `${item.name} — ${item.currentStock} ${item.unit} remaining`,
              dueDate: new Date(),
              referenceId: item._id,
            };

            if (daysRemaining === 0) {
              finalReminders.push(reminderItem);
            } else {
              upcomingReminders.push(reminderItem);
            }
          }
        }
      }

      const equipmentItems = await Equipment.find({
        farmId: farm._id,
        status: 'active',
        nextMaintenanceDate: { $lte: threeDaysFromNow },
      });

      for (const equip of equipmentItems) {
        const maintenanceDate = new Date(equip.nextMaintenanceDate);
        maintenanceDate.setHours(0, 0, 0, 0);

        const daysUntil = Math.ceil((maintenanceDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntil === 0) {
          finalReminders.push({
            type: 'equipment',
            title: 'Maintenance Due Today',
            description: `${equip.name} — service required`,
            dueDate: equip.nextMaintenanceDate,
            referenceId: equip._id,
          });
        } else if (daysUntil === 3) {
          upcomingReminders.push({
            type: 'equipment',
            title: 'Maintenance in 3 Days',
            description: `${equip.name} — schedule service`,
            dueDate: equip.nextMaintenanceDate,
            referenceId: equip._id,
          });
        }
      }

      const tasks = await Task.find({
        farmId: farm._id,
        status: { $in: ['pending', 'in_progress'] },
        dueDate: { $lte: threeDaysFromNow },
      });

      for (const task of tasks) {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntil === 0) {
          finalReminders.push({
            type: 'task',
            title: 'Task Due Today',
            description: task.title,
            dueDate: task.dueDate,
            referenceId: task._id,
          });
        } else if (daysUntil === 3) {
          upcomingReminders.push({
            type: 'task',
            title: 'Task Due in 3 Days',
            description: task.title,
            dueDate: task.dueDate,
            referenceId: task._id,
          });
        }
      }

      if (upcomingReminders.length > 0) {
        await emailService.send({
          to: farmAdmin.email,
          template: 'reminderUpcoming',
          data: {
            farmName: farm.name,
            reminders: upcomingReminders,
            count: upcomingReminders.length,
          },
        });
        logger.info(`[Reminder] Sent upcoming to farm ${farm._id}`, { count: upcomingReminders.length });
      }

      if (finalReminders.length > 0) {
        await emailService.send({
          to: farmAdmin.email,
          template: 'reminderFinal',
          data: {
            farmName: farm.name,
            reminders: finalReminders,
            count: finalReminders.length,
          },
        });
        logger.info(`[Reminder] Sent final to farm ${farm._id}`, { count: finalReminders.length });
      }
    } catch (error) {
      logger.error(`[Reminder] Failed for farm ${farm._id}`, { error: error.message });
    }
  }
};

module.exports = { run };