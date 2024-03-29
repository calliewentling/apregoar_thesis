from pytz import NonExistentTimeError
from app import app

#https://exploreflask.com/en/latest/configuration.html
#https://flask.palletsprojects.com/en/2.0.x/tutorial/layout/

import os
import flask
from flask import Flask, g, render_template, request, flash, jsonify, make_response, json
#from flask_sqlalchemy import SQLAlchemy
#from apregoar.models import Stories, UGazetteer, Instances, Users, EGazetteer, SpatialAssoc
from sqlalchemy import text
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from flask_table import Table, Col
import json
import geojson
import shapely.wkt as wkt
import shapely.wkb as wkb
import psycopg2
import pandas as pd
import datetime
from sqlalchemy import *
from sqlalchemy.orm import *
from geoalchemy2 import *
from geoalchemy2.shape import from_shape
import shapely
import shapely.wkt
#import osgeo.ogr
from shapely.geometry import Polygon, MultiPolygon
from flask import request, redirect, jsonify, make_response, render_template, session as fsession, redirect, url_for
from app import engine, session, text
from werkzeug.utils import secure_filename



#import geopandas as gpd
#import geojson

#global currentuser
#global currentuid

###############
# Callies Notes
###############
# 
#Url_for redirects to the defined function, not the app.route or template

app.secret_key = '2b3c4ee1b3eea60976f2d55163bbd0f88613657a9260e7de60d4b97c04273460'

users = {} #is this necessary


def delete_i_derivs(delete_inst, con):
    print("Entering instance derivative delete sequence for: ", delete_inst)
    result_val = ""
    try:
        with engine.connect() as conn:
            SQL = text("SELECT publication_id FROM apregoar.geonoticias WHERE i_id = :x")
            SQL = SQL.bindparams(x=delete_inst[0])
            result = conn.execute(SQL)
    except:
        print("Error extracting publication_id for instancse")
    else:
        publication_ids = []
        if result:
            for i in result:
                publication_ids = i["publication_id"]
        if len(publication_ids) > 0:
            pub_queries = []
            for id in publication_ids:
                print("id: ",id)
                pub_query = "REFRESH MATERIALIZED VIEW apregoar.geonoticias_"+str(id)+";"
                pub_queries.append(pub_query)
            try:
                with con:
                    with con.cursor() as cur:
                        cur.execute("DELETE FROM apregoar.instance_ugaz WHERE i_id = ANY (%s);", (delete_inst,))
                        print("Passed delete from instance_ugaz")
                        cur.execute("DELETE FROM apregoar.instance_egaz WHERE i_id = ANY (%s);", (delete_inst,))
                        print("Passed delete from instance_egaz")
                        cur.execute("DELETE FROM apregoar.instance_ngaz WHERE i_id = ANY (%s);",(delete_inst,))
                        print("Passed delete from instance_ngaz")        
                        cur.execute("DELETE FROM apregoar.instances WHERE i_id = ANY (%s);", (delete_inst,))
                        print("Passed delete from instances")
                        cur.execute("REFRESH MATERIALIZED VIEW apregoar.publication_info")
                        print("Refreshed publication_info materialized view")
                        cur.execute("REFRESH MATERIALIZED VIEW apregoar.geonoticias")
                        print("Refreshed geonoticias materialized view")
                        for q in pub_queries:
                            cur.execute(q)
                            print("Success: ",q)
            except psycopg2.Error as e:
                print("e.pgerror:  ",e.pgerror)
                print("e.diag.message_primary: ", e.diag.message_primary)
                print("Error in deleting instance derivatives")
                con.rollback()
                result_val = "failure"
            else:
                con.commit()
                print("success!")
                result_val = "success"
        else:
            print("No publication associated")
            return
        
    
    print("result_val inside instance: ",result_val)
    return result_val

@app.before_request
def before_request_func():
    #print("Test of before request")
    #Load all users (valid for sign in)
    try:
        with engine.connect() as conn:
            SQL = text("SELECT * FROM apregoar.users")
            #print(SQL)            
            result = conn.execute(SQL)   
            #print("SQL executed")
            
            
    except:
        print("Error in connecting!")
        feedback = f"Erro!"
        flash(feedback, "danger")
    else:
        for row in result:
            #print(row)
            #print("username:",row['username'])
            #print("affiliation:",row['organization'])
            users[row['username']] = {
                "u_id": row["u_id"],
                "username": row['username'],
                "affiliation": row['organization'],
                "email": row['email']
            }

    finally:
        conn.close()


        #print(users)
        #print("Checkpoint end connect")  
    
    #https://pythonise.com/series/learning-flask/python-before-after-request


#########################
###### User login
#########################
'''
@app.route("/publisher/sign_up", methods=["GET","POST"])
def sign_up():
    if request.method == "POST":
        req = request.form
        missing = list()

        for k, v in req.items():
            if v =="":
                missing.append(k)
        
        if missing:
            feedback = f"Missing fields for {', '.join(missing)}"
            return render_template("publisher/sign_up.html", feedback=feedback)

        username = request.form.get("username")
        password = request.form.get("password")
        email = request.form.get("email")
        organization = request.form.get("affiliation")
        
        try:
            with engine.connect() as conn:
                print(username)
                SQL = text("SELECT username FROM apregoar.users WHERE username = :x")
                SQL = SQL.bindparams(x=username)
                result = conn.execute(SQL)
        except:
            print("Error in validating unique username")
            feedback=f"Erro"
            flash(feedback, "danger")
        else:
            count = 0
            for row in result:
                print("username:",row['username'])
                count += 1
            print(count)
            if count == 0:
                con = psycopg2.connect("dbname=postgres user=postgres password=thesis21") #previous password: thesis2021
                try:
                    with con:
                        with con.cursor() as cur:
                            cur.execute("""
                                INSERT INTO apregoar.users (username, password, organization, email,created,edited)
                                VALUES (%(username)s,%(password)s,%(organization)s,%(email)s,NOW(),NOW())
                                RETURNING u_id
                                ;""",
                                {'username':username,'password':password, 'organization':organization, 'email':email}
                            )
                            u_id = cur.fetchone()[0]
                            print("New user id: ",u_id)
                            con.commit()
                            cur.close()
                except:
                    print("Error in saving new user")
                    feedback=f"Erro"
                    flash(feedback, "danger")
                    conn.rollback()
                    cur.close()
                else:
                    print("User added to database")
                    return redirect(url_for("sign_in"))
            else:
                feedback=f"This username is already in use. Please select a new username."
                return render_template("publisher/sign_up.html", feedback=feedback)
    return render_template("publisher/sign_up.html")

@app.route("/publisher/sign_in", methods=["GET", "POST"])
def sign_in():
    print("Signin")
    if request.method == "POST":
        req = request.form
        username = req.get("username")
        password = req.get("password")
        print("Entered username: ", username)
        print("Entered password: ", password)
        try:
            with engine.connect() as conn:
                SQL = text("SELECT * FROM apregoar.users WHERE username = :x and password = :y")
                SQL = SQL.bindparams(x=username, y=password)
                print(SQL)
                result = conn.execute(SQL)   
                print("SQL executed")
        except:
            print("Error in validating username password combo")
            feedback = f"Erro"
            flash(feedback,"danger")
        else:
            user = {}
            for row in result:
                user = {
                    username: {
                        "username": row['username'],
                        "affiliation": row['organization'],
                        "email": row['email'],
                        "u_id": row['u_id']
                    }
                }
                print("users dict: ",user)
            print("Checkpoint end connect")  


            #while result is not None: #Not using because result is always "not None", even if empty
            if username in user:
                print("Checkpoint results")
                #print(result[0])
                #g.username = username
                fsession['username'] = username #!!!!
                fsession['u_id'] = user[username]["u_id"]
                fsession['org'] = user[username]["affiliation"]
                fsession['email'] = user[username]["email"]
                print("fsession: ",fsession)
                #session.modified = True
                print("Session user assigned")
                return redirect(url_for("publisher_dashboard"))    
            else:
                print("Combo not found")
                feedback = f"Username/password combination not found. Please try again."
                return render_template("publisher/sign_in.html", feedback=feedback)

    return render_template("publisher/sign_in.html")

@app.route("/publisher/my_profile")
def pub_profile():
    if not fsession.get("username") is None:
        user = {
            "username": fsession["username"],
            "email": fsession["email"],
            "org": fsession["org"], 
            "u_id": fsession["u_id"]
        }
        print("User id: ",user["u_id"])

        return render_template("publisher/my_profile.html", user=user)
    else:
        print("No username found in fsession")
        return redirect(url_for("sign_in"))

@app.route("/publisher/sign_out")
def sign_out():
    fsession.pop("username", None)
    fsession.pop("email", None)
    fsession.pop("u_id", None)
    fsession.pop("org", None)
    print("fsession: ",fsession)
    return redirect(url_for("sign_in"))

'''
#########################
###### Dashboard and Profile
#########################

@app.route("/publisher/dashboard")
def publisher_dashboard():
    if not fsession.get("username") is None:
        print("User recognized")
        print("user: ",fsession["username"])
        print("p_ids: ",fsession["p_ids"], type(fsession["p_ids"]))

        try:
            with engine.connect() as conn:
                #SQL = text("SELECT * FROM apregoar.stories WHERE u_id = :x AND publication = :y")
                SQL = text("SELECT * FROM apregoar.stories WHERE u_id = :x ORDER BY pub_date DESC")
                SQL = SQL.bindparams(x=fsession["u_id"])
                result = conn.execute(SQL)
        except:
            print("Error in identifying stories from user")
            feedback = f"Erro no login"
            return render_template("publisher/dashboard.html", username=fsession["username"], uID = fsession["u_id"], organization=fsession["org"])
        else:
            user_stories = []
            for row in result:
                u_story = {
                    row["s_id"] : {
                        "title": row["title"],                            
                        "date": row["pub_date"]
                    } 
                }
                user_stories.append(u_story)
        finally: conn.close()

        if len(fsession["p_ids"]) > 0:
            all_org_stories = {}
            for p_id in fsession["p_ids"]:
                print("p_id: ",p_id)
                try:
                    with engine.connect() as conn:
                        SQL = text("SELECT * FROM apregoar.stories LEFT JOIN apregoar.publicationing ON stories.s_id = publicationing.story_id LEFT JOIN apregoar.publications ON publicationing.p_id = publications.publication_id WHERE p_id = :y")
                        SQL = SQL.bindparams(y=p_id)
                        result = conn.execute(SQL)
                except:
                    print("Error in identifying stories from user publication")            
                else:
                    org_stories = []
                    pub_name = ""
                    for row in result:
                        pub_name = row["publication_name"]
                        #print("pub_name: ",pub_name)
                        o_story = {
                            row["s_id"] : {
                                "title": row["title"],
                                "date": row["pub_date"]
                            }
                        }
                        #print("o_story: ",o_story)
                        org_stories.append(o_story)
                    all_org_stories[pub_name] = org_stories
                print("all_org_stories: ",all_org_stories)
            return render_template("publisher/dashboard.html", username=fsession["username"], uID = fsession["u_id"], organization=fsession["org"], userStories = user_stories, allOrgStories = all_org_stories)
        return render_template("publisher/dashboard.html", username=fsession["username"], uID = fsession["u_id"], organization=fsession["org"], userStories = user_stories)    
    else:
        print("No username found in fsession")
        feedback=f"Não há um user ativo."
        #flash(feedback,"danger")
        return redirect(url_for("sign_inU", login_source = "publisher"))

@app.route("/publisher/publication")
def publisher_profile():
    return render_template("publisher/publication.html")

#########################
###### New Story
#########################

@app.route("/publisher/addstory")
def addstory():
    #Add selection of relevant values here: publication options, sections, authors, and tags
    try:
        with engine.connect() as conn:
            SQL = text("SELECT * FROM apregoar.publication_info WHERE :x = ANY(user_ids)")
            SQL = SQL.bindparams(x=fsession["u_id"])
            result = conn.execute(SQL)
    except:
        print("Error in loading publisher info")
        return render_template("publisher/dashboard.html", username=fsession["username"], uID = fsession["u_id"], organization=fsession["org"])
    else:
        publication_info = {}
        for row in result:
            #print("row['authors']",row["authors"])
            authors = row["authors"]
            print("authors (prepop): ",authors)
            try:
                authors.pop("1")
                print("{1: '*sem valor'} removed")
            except:
                print("no need to remove {1: '*sem valor'}")
            print("authors (postpop): ",authors)
            pub_info = {
                "publication_name": row["publication_name"],
                "sections": row["main_sections"],
                "tags": row["tags"],
                "authors": authors,                        
            }
            publication_info[row["publication_id"]] = pub_info
            #publication_info.append(pub_info)
        print("publication_info: ",publication_info)
    finally: conn.close()

    return render_template("publisher/create.html", publication_info = publication_info)

@app.route("/publisher/<s_id>/review", methods=["GET","POST"])
def review_e(s_id):
    print({s_id})
    ### DELETING INSTANCES/STORIES
    if request.method =="POST": 
        delete_req = request.form.to_dict()
        print(delete_req)
        delete_inst = []
        delete_story = []
        con = psycopg2.connect("dbname=postgres user=postgres password=thesis21") #previous password: thesis2021
        for key in delete_req.keys():
            #Deleting a story and all instances
            if "deleteStory" in key:
                key = int(key[11:])
                delete_story.append(key)
                print("key type: ",type(key))
                print("We're deleting a story (ID: ",key,")!")
                s_id = key
                print("The story key of the page = ",s_id)
                #Delete story and related instances
                try:
                    with engine.connect() as conn:
                        SQL = text("SELECT i_id FROM apregoar.instances WHERE s_id = :x")
                        SQL = SQL.bindparams(x=s_id)
                        result = conn.execute(SQL)
                except:
                    print("Error in finding instances related to story")
                else:
                    delete_i = []
                    #INSTANCES FOUND
                    if result:
                        print("Result returned")
                        for i in result:
                            print("i: ",i)
                            delete_i.append(i["i_id"])
                        print("Related instances: ", delete_i, " Totalling: ", len(delete_i))
                        if len(delete_i)>0:
                            print("It appears that there are instances")
                            result_val = delete_i_derivs(delete_i, con)
                            print("Status of deleting instance and derivatives: ",result_val)
                        else:
                            print("Result returned but no instances")
                    #NO INSTANCES FOUND
                    else: 
                        print("It appears there are no instances")
                    try:
                        with engine.connect() as conn:
                            SQL2 = text("SELECT p_id FROM apregoar.publicationing WHERE story_id = :x")
                            SQL2 = SQL2.bindparams(x=s_id)
                            result2 = conn.execute(SQL2)
                    except: 
                        print("Error in extracting publication id")
                    else:
                        if result2:
                            print("result2 returned")
                            print("result2: ",result2)
                            for j in result2:
                                print("i: ",j)
                                publication_id = j["p_id"]
                                print("publication_id = ",publication_id)
                                pub_query = "REFRESH MATERIALIZED VIEW apregoar.geonoticias_"+str(publication_id)+";"
                                print("pub_query: ",pub_query)
                                
                        else:
                            print("No result2 returned")
                        #DELETE STORY                                                                             
                        try:
                            with con:
                                with con.cursor() as cur:
                                    cur.execute("DELETE FROM apregoar.sectioning WHERE story_id = %s;", (s_id,))
                                    print("Passed delete from sectioning")
                                    cur.execute("DELETE FROM apregoar.tagging WHERE story_id = %s;", (s_id,))
                                    print("Passed delete from tagging")
                                    cur.execute("DELETE FROM apregoar.publicationing WHERE story_id = %s;", (s_id,))
                                    print("Passed delete from publicationing")
                                    cur.execute("DELETE FROM apregoar.authoring WHERE story_id = %s;", (s_id,))
                                    print("Passed delete from authoring")
                                    cur.execute("DELETE FROM apregoar.stories WHERE s_id = %s;", (s_id,))
                                    print("Story ",s_id," prepped for deletion")
                                    cur.execute("REFRESH MATERIALIZED VIEW apregoar.publication_info")
                                    print("Refreshed publication_info materialized view")
                                    cur.execute("REFRESH MATERIALIZED VIEW apregoar.geonoticias")
                                    print("Refreshed geonoticias materialized view")
                                    print("pub_query: ",pub_query)                                
                                    cur.execute(pub_query)
                                    print("Refreshed MATERIALIZED VIEW of publication ",publication_id)
                        except: 
                            con.rollback()
                            #con.close()
                            print("Error deleting story")
                            return redirect(url_for("publisher_dashboard"))
                        else:
                            con.commit()
                            
                            con.close()
                            print("Successfully deleted story and ",len(delete_i),"associated instances")
                            #We should go to the next scenario
                            return redirect(url_for("publisher_dashboard")) 
                
            else: #ASSUMING ONLY DELETING SPECIFIC INSTANCES
                if "instance" in key:
                    key = int(key[8:]) #Extract instance key (ignore "instance", capture number)
                    delete_inst.append(key)
                    print("Instance for deletion: ",delete_inst)
        result_val = delete_i_derivs(delete_inst, con)
        print("Status of individual instance delete: ",result_val)
                #con.close()
        
                    

    ### NORMAL BEHAVIOR: LOADING REVIEW ####
    try:
        with engine.connect() as conn:
            SQL = text("SELECT * FROM apregoar.geonoticias WHERE s_id = :x")
            SQL = SQL.bindparams(x=s_id)
            print(SQL)
            result = conn.execute(SQL)
    except:
        print("Error in extracting instances for this story")
        feedback=f"Não consiguimos de procurar as instâncias da história"
        flash(feedback, "warning")
        return render_template("publisher/dashboard.html")
        #return render_template("publisher/review.html", story=story, sID = s_id, instances=[])
    else:
        print("successfully extracted story and instances from geonoticias")
        instances = []
        story = {}
        for row in result:
            print("row: ",row)
            story = row
            if row["i_id"] != None: 
                if row["t_begin"] is None:
                    instance = {
                        row["i_id"] : {
                            "p_name": row["p_name"],
                            "timeframe": ""
                        }
                    }
                elif row["t_begin"] == row["t_end"]:
                    instance = {
                        row["i_id"] : {
                            "p_name": row["p_name"],
                            "timeframe": str(row["t_begin"].date()),
                        }
                    }
                else:
                    instance = {
                        row["i_id"] : {
                            "p_name": row["p_name"],
                            "timeframe": str(row["t_begin"].date())+" - "+str(row["t_end"].date())
                        }
                    }
                instances.append(instance)
            else:
                break
        
        print("story: ",story)
        print("instances: ",instances)
        return render_template("publisher/review.html", story=story, sID = s_id, instances=instances) #
        """else:
            feedback = f"No valid story selected"
            flash(feedback, "danger")"""

    return render_template("publisher/dashboard.html")

def coalesce(*values, valType):
    #Return the first non-None value or None if all values are None
    print("values: ",values)
    if valType == "str":
        defaultVal = ""
    if valType == "int":
        defaultVal = 0
    else:
        defaultVal = None
    return next((v for v in values if v is not None),defaultVal)

@app.route("/publisher/review", methods=['POST'])
def review():
    print()
    print("current user is: ",fsession["username"])
    print("current user id is: ",fsession["u_id"]) 
    print()

    print("formType: ",request.form["formType"])
    print("request form: ",request.form)
    if request.form["formType"] == "create_story":
        try:
            with engine.connect() as conn:
                SQL = text("SELECT web_link FROM apregoar.stories")
                result = conn.execute(SQL)
        except:
            print("Error in extracting desired story from database")
            feedback=f"Erro"
            flash(feedback,"danger")
        else:
            print("successful extraction of previous web_links from DB")
            existing_urls = []
            for row in result:
                existing_urls.append(row["web_link"])
            #print(existing_urls)
            if "section" in request.form.keys():
                sections = coalesce(request.form["section"].lower(),valType="str")
            else:
                sections = ""
            if "author" in request.form.keys():
                author = coalesce(request.form["author"].lower(),valType="str")
            else:
                author = ""
            story = {
                ##Required
                "title": request.form["title"],
                "pub_date": request.form["pubDate"],
                "web_link": request.form["webLink"],
                "publication": request.form["publication"].lower(),
                ##Optional 
                "summary": request.form["summary"],
                "section" : sections, 
                "tags": request.form["tags"].lower(),
                "author": author,
            }

            if story["web_link"] in existing_urls:
                print("URL already associated with another story")                
                return redirect(url_for("addstory"))

            #Prepare & Submit
            con = psycopg2.connect("dbname=postgres user=postgres password=thesis21") #previous password: thesis2021
            try:
                with con:
                    with con.cursor() as cur:
                        cur.execute("""
                            INSERT INTO apregoar.stories (title, summary, pub_date, web_link, section, tags, author, publication, u_id, created, edited)
                            VALUES (%(title)s,%(summary)s,%(pub_date)s,%(web_link)s,%(section)s, %(tags)s, %(author)s,%(publication)s,%(u_id)s, NOW(), NOW())
                            RETURNING s_id
                            ;""",
                            {'title':story["title"],'summary':story["summary"], 'pub_date':story["pub_date"], 'web_link': story["web_link"], 'section': story["section"], 'tags': story["tags"], 'author': story["author"], 'publication':story["publication"], 'u_id':fsession["u_id"]}
                        )
                        s_id = cur.fetchone()[0]
                        print("Story added to database. s_id: ",s_id)
                        
            except psycopg2.Error as e:
                #If not submitted, attempt to create again
                print(e.pgerror)
                print(e.diag.message_primary)
                feedback = f"Excepção: a história não ficou guardada. Erro: "+e.pgerror+", "+e.diag.message_primary
                flash(feedback, "danger")
                con.rollback()
                con.close()
                return redirect(url_for("addstory"))
                #return render_template("publisher/create.html")
            else:
                story["s_id"] = s_id
                #Saving Tags
                if story["tags"]:
                    tags = story["tags"].split(",")
                    for tag in tags:
                        tag=tag.strip()
                        if tag == "":
                            tags.remove(tag)
                        if tag == " ":
                            tags.remove(tag)
                    if len(tags)>0:
                        savingAttributes(attr = "tag",s_id=s_id,con=con,attr_vals=tags)
                    else:
                        print("Actually, no real tags associated")
                        emptyAttribute(attr="tag", s_id = s_id, con=con)
                else:  
                    print("No tags associated")
                    emptyAttribute(attr="tag", s_id = s_id, con=con) 
                #Saving Authors
                if story["author"]:
                    authors = story["author"].split(",")
                    for author in authors:
                        author = author.strip()
                        if author == "":
                            authors.remove(author)
                        if author == " ":
                            authors.remove(author)
                    if len(authors)>0:
                        savingAttributes(attr = "author",s_id=s_id,con=con,attr_vals=authors)
                    else:
                        print("Actually, no real authors associated")
                        emptyAttribute(attr="author", s_id = s_id, con=con)
                else:  
                    print("No authors associated")
                    emptyAttribute(attr="author", s_id = s_id, con=con)
                #Saving Sections
                if story["section"]:
                    section = story["section"]
                    section = section.strip()
                    if section == "":
                        emptyAttribute(attr="section", s_id = s_id, con=con)
                    elif section == " ":
                        emptyAttribute(attr="section", s_id = s_id, con=con)
                    else:
                        savingAttributes(attr = "section",s_id=s_id,con=con,attr_vals=[section])
                        
                else:  
                    print("No authors associated")
                    emptyAttribute(attr="section", s_id = s_id, con=con)
                #Saving Publication
                if story["publication"]:
                    publication = story["publication"]
                    if publication == "":
                        publication_id = emptyAttribute(attr="publication", s_id = s_id, con=con)
                    elif publication == " ":
                        publication_id = emptyAttribute(attr="publication", s_id = s_id, con=con)
                    else:
                        publication_id = savingAttributes(attr = "publication",s_id=s_id,con=con,attr_vals=[publication])
                    pub_query = "REFRESH MATERIALIZED VIEW apregoar.geonoticias_"+str(publication_id)+";"
                else:  
                    print("No publications associated")
                    emptyAttribute(attr="publication", s_id = s_id, con=con)
                try:
                    with con:
                        with con.cursor() as cur:
                            cur.execute("REFRESH MATERIALIZED VIEW apregoar.publication_info")
                            print("successful refresh of publiction_info materialized view")
                            cur.execute("REFRESH MATERIALIZED VIEW apregoar.geonoticias")
                            print("Refreshed geonoticias materialized view")
                            cur.execute(pub_query)
                            print(pub_query)
                except:
                    print("Unsuccessful refresh of materialized views")
                con.commit()                   
                con.close()
                return redirect(url_for("review_e", s_id = s_id))
                #return render_template("publisher/review.html", story=story, sID = s_id, instances = [])
    return render_template("publisher/dashboard.html")

def savingAttributes(attr,s_id,con,attr_vals):
    print("Saving: "+attr)
    try:
        with engine.connect() as conn:
            SQL = text("SELECT * FROM apregoar."+attr+"s")
            print(SQL)
            result = conn.execute(SQL)
    except:
        print("Error in extracting "+attr+"s from database")
        feedback=f"Erro"
        flash(feedback,"danger")
    else:
        existing_vals = {}
        attr_id_name = attr[0]+"_id"
        if attr == "tag":
            attr_ing = "tagging"
        else:
            attr_ing = attr+"ing"
        for row in result:
            existing_vals[row[attr+"_name"]] = row[attr+"_id"]
        for val in attr_vals:
            val.strip().lower()
            if val not in existing_vals:
                try:
                    with con:
                        with con.cursor() as cur:
                            cur.execute(
                                "INSERT INTO apregoar."+attr+"s ("+attr+"_name) VALUES (%(attr_name)s) RETURNING "+attr+"_id;",
                                {'attr_name':val}
                            )
                            id = cur.fetchone()[0]
                except psycopg2.Error as e:
                    print(e.pgerror)
                    print(e.diag.message_primary)
                    con.rollback()
                    con.close()
                else:
                    print("extracted "+attr+"s from db")
            elif val in existing_vals:
                id = existing_vals[val]
                print("existing "+attr+"s =",id," ",val)
            else:
                print("how did we get here?")
            try:
                with con:
                    with con.cursor() as cur:
                        cur.execute(
                            "INSERT INTO apregoar."+attr_ing+" (story_id,"+attr_id_name+") VALUES (%(s_id)s,%(attr_id)s);",
                            {'s_id':s_id, 'attr_id':id}
                        )
                        print(attr+" relation added to database")
            except psycopg2.Error as e:
                print(e.pgerror)
                print(e.diag.message_primary)
                con.rollback()
                con.close()
                return redirect(url_for("addstory"))
                #return render_template("publisher/create.html")
            else:
                print("Successful association to existing "+attr+"!")
    return id #This is to help with publication ids to refresh the correct materialized view


def emptyAttribute(attr,s_id,con):
    print(attr)
    if attr == "tag":
        attr_ing = "tagging"
    else:
        attr_ing = attr+"ing"
    no_vals = {
        "tag": 102,
        "author": 1,
        "section": 1,
        "publication": 9
    }
    attr_id_val = no_vals[attr]
    attr_id_name = attr[0]+"_id"
    print("attr_id_val: ",attr_id_val," attr_id_name: ",attr_id_name)
    try:
        with con:
            with con.cursor() as cur:
                cur.execute("INSERT INTO apregoar."+attr_ing+" (story_id,"+attr_id_name+") VALUES (%(s_id)s,%(attr_id)s);",
                    {'s_id':s_id, 'attr_id':attr_id_val}
                )
                print(attr+" relation added to database")
    except psycopg2.Error as e:
        print(e.pgerror)
        print(e.diag.message_primary)
        con.rollback()
        con.close()
        return redirect(url_for("addstory"))
        #return render_template("publisher/create.html") #
    else:
        print("Successful association to '*sem valor' of "+attr)
    return attr_id_val


#########################
###### New Instance
#########################
            
@app.route("/publisher/<s_id>/localize", methods=["GET", "POST"])
def localize(s_id):
    print({s_id})
    
    if request.method == 'POST':
        print("request method is post")
        # check if hte post request has the file part
        if 'file' not in request.files:
            print('No file part')
            return redirect(request.url)
        file = request.files['file']
        print("file: ",file)
        # if the user does not select a file, the broswer submits an # emplty file without a filename.
        if file.filename == '':
            print('No selected file')
            return redirect(request.url)
        if file and allowed_file(request.filename):
            filename = secure_filename(file.filename)
            print("filename: ",filename)
            flash('Success!')
            return redirect(request.url)
        else:
            print("We got to the else")
        print("about to return")
        return  make_response(filename, 200)
        
    else:

        try:
            with engine.connect() as conn:
                SQL = text("SELECT * FROM apregoar.stories LEFT JOIN apregoar.publicationing ON stories.s_id = publicationing.story_id LEFT JOIN apregoar.publications ON publicationing.p_id = publications.publication_id WHERE s_id = :x")
                SQL = SQL.bindparams(x=s_id)
                result = conn.execute(SQL)
        except:
            conn.close()
            print("Error in extracting desired story from database")
            feedback=f"Erro"
            flash(feedback,"danger")
        else:
            conn.close()
            story2 = {}
            story={}
            for row in result:
                story = row
            #egaz_area = []
            #egaz_freguesia = []
            #egaz_concelho = []
            #egaz_extra = []

            if story:             
                return render_template("publisher/localize.html", story=story, sID = s_id)
                    #return render_template("publisher/localize.html", story=story, sID = s_id, eGazF=egaz_freguesia, eGazC=egaz_concelho, eGazA = egaz_area, eGazX = egaz_extra)
            else:
                feedback = f"No valid story selected"
                flash(feedback, "danger")
    
        return render_template("publisher/dashboard.html")

@app.route("/publisher/<s_id>/gazetteer", methods=["GET", "POST"])
def loadGaz(s_id):
    #Prepare fetch response
    req = request.get_json()
    print("Received: ")
    print(req)
    print()
    gazetteer = req["gazetteer"]
    print(gazetteer)
    #Load relevant user and story info
    u_id = fsession["u_id"]
    pub_id = req["pubID"]
    print("Story id: ",s_id,", User ID: ",u_id)
    #Access relevant queries
    if gazetteer == "ugaz_personal":
        SQL = text("""
            SELECT
                DISTINCT p_id AS gaz_id,
                p_name AS gaz_name,
                p_desc AS gaz_desc,
                u_id
            FROM apregoar.access_ugaz
            WHERE u_id = :x
            ORDER BY gaz_name ASC
            ;
        """)
        SQL = SQL.bindparams(x=u_id)
    elif gazetteer == "ugaz_empresa":
        #Define query
        SQL = text("""
            SELECT
                DISTINCT p_id AS gaz_id,
                p_name AS gaz_name,
                p_desc AS gaz_desc,
                publication AS gaz_pub
            FROM apregoar.access_ugaz
            WHERE pub_id = :x AND u_id NOT IN (:y)
            ORDER BY gaz_name ASC
            ;
        """)
        SQL = SQL.bindparams(x=pub_id,y=u_id)
    elif gazetteer == "ugaz_all":
        SQL = text("""
            SELECT
                DISTINCT p_id AS gaz_id,
                p_name AS gaz_name,
                p_desc AS gaz_desc,
                u_id
            FROM apregoar.access_ugaz
            WHERE u_id NOT IN (:x)
            ORDER BY gaz_name ASC
            ;
        """)
        SQL = SQL.bindparams(x=u_id)
    elif gazetteer == "egaz_freguesia":
        SQL = text("""
            SELECT
                DISTINCT e_id AS gaz_id,
                name AS gaz_name,
                type AS gaz_desc
            FROM apregoar.egazetteer
            WHERE type = 'freguesia'
            ORDER BY gaz_name ASC
            ;
        """)
    elif gazetteer == "egaz_concelho":
        SQL = text("""
            SELECT
                DISTINCT e_id AS gaz_id,
                name AS gaz_name,
                type AS gaz_desc
            FROM apregoar.egazetteer
            WHERE type = 'concelho'
            ORDER BY gaz_name ASC
            ;
        """)
    elif gazetteer == "egaz_green":
        SQL = text("""
            SELECT
                DISTINCT e_id AS gaz_id,
                name AS gaz_name,
                type AS gaz_desc
            FROM apregoar.egazetteer
            WHERE type = 'espaço_verde'
            ORDER BY gaz_name ASC
            ;
        """)
    elif gazetteer == "egaz_archive":
        print("egaz_archive")
        SQL = text("""
            SELECT
                DISTINCT e_id AS gaz_id,
                name AS gaz_name,
                'archive' AS gaz_desc
            FROM apregoar.egazetteer
            WHERE type IN ('freguesia_archivo')
            ORDER BY gaz_name ASC
            ;
        """)
    elif gazetteer == "egaz_extra":
        print("egaz_extra")
        SQL = text("""
            SELECT
                DISTINCT e_id AS gaz_id,
                name AS gaz_name,
                type AS gaz_desc
            FROM apregoar.egazetteer
            WHERE type NOT IN ('concelho','freguesia','freguesia_archivo')
            ORDER BY gaz_name ASC
            ;
        """)
    elif gazetteer == "poi_poi":
        search_term = req["searchTerm"]
        print("search_term: ",search_term)
        query = """
            SELECT
                DISTINCT id as gaz_id,
                name as gaz_name,
                'poi' AS gaz_desc
            FROM apregoar.apregoar_poi
            ORDER BY gaz_name ASC
            ;
        """
        print("query:",query)
        if search_term:
            where_clause = " WHERE LOWER(name) LIKE '%"+search_term.lower()+"%';"
            print("where_clause",where_clause)
            SQL = text(query+where_clause)
        else:
            SQL = text(query+";")
        #print("SQL: ",SQL)
        print("Successfull definition of SQL!")
    elif gazetteer == "gaz_prev":
        search_term = req["searchTerm"]
        print("search_term: ",search_term)
        query_egaz = "\nSELECT DISTINCT e_id as gaz_id, name as gaz_name, type AS gaz_desc\nFROM apregoar.egazetteer"
        #Note: order by is in searchterm query
        print("query_egaz:",query_egaz)
        query_ugaz = "\nSELECT DISTINCT p_id as gaz_id, p_name as gaz_name, concat('ugaz',u_id,'_',pub_id) as gaz_desc\nFROM apregoar.access_ugaz"
        #Note: order by is in searchterm query
        #print("query_ugaz:",query_ugaz)
        if search_term:
            where_clause_e = "\nWHERE LOWER(name) SIMILAR TO LOWER('%("+search_term.replace(", ","|")+")%')"
            where_clause_u = "\nWHERE LOWER(p_name) SIMILAR TO LOWER('%("+search_term.replace(", ","|")+")%') "
            #print("where_clause_e",where_clause_e,". where_clause_u: ",where_clause_u)
            SQL = text(query_ugaz+where_clause_u+"\nUNION "+query_egaz+where_clause_e+"\nORDER BY gaz_name ASC\n;")
        else:
            SQL = text(query+"\n;")
        print("SQL: ",SQL)
        print("Successfull definition of SQL!")
    elif gazetteer == "poi_locale":
        layer_extent = req["layerExtent"]
        print("layer_extent: ",layer_extent)
        query = """
            SELECT
                DISTINCT id as gaz_id,
                name as gaz_name,
                'poi' as gaz_desc
            FROM apregoar.apregoar_poi
            ORDER BY gaz_name ASC
            ;
        """
        print("query for locale: ",query)
        SQL = text(query)    
    else:
        #If no valid gazetteer selected
        res = make_response(jsonify("No valid gazetteer selected"))
    #Call query for gazetteer
    try:
        with engine.connect() as conn:
            result = conn.execute(SQL)
    except:
        print("Error in accessing gazetteer",gazetteer)
        res = make_response(jsonify("Error in accessing the gazetteer"))
    else:
        gaz_options=[]
        for row in result:
            print(row)
            ugaz_entry = {
                "gaz_id": row["gaz_id"],
                "gaz_name": row["gaz_name"],
                "gaz_desc": row["gaz_desc"]
            }
            gaz_options.append(ugaz_entry)
        print(gaz_options)
        res = make_response(jsonify(gaz_options), 200)

    return res
    
    
    
    
    

@app.route("/publisher/<i_id>/edit_instance", methods=["GET", "POST"])
def edit_instance(i_id):
    print("Instance ID: ",{i_id})
    try:
        with engine.connect() as conn:
            #Edit this to connect instances to instance_ugaz to ugaz
            SQL = text("""
                SELECT * 
                FROM apregoar.geonoticias
                WHERE i_id = :x
                ;
                """)
            SQL = SQL.bindparams(x=i_id)
            result = conn.execute(SQL)
    except:
        print("Error in extracting desired instance from database")
        feedback=f"Erro"
        flash(feedback,"danger")
    else:
        instance = {}
        for row in result:
            instance = row
            print("title",instance["title"])
        if instance:
            d_begin = instance["t_begin"].date()
            d_end = instance["t_end"].date()
            print(d_begin)
            print(d_end)
            map_story_filter = "s_id="+str(instance["s_id"])
            print("map_story_filter",map_story_filter)
            return render_template("publisher/instance.html", instance=instance, mapStoryFilter=map_story_filter, dBegin = d_begin, dEnd = d_end)
        else:
            feedback = f"No valid instance selected"
            flash(feedback, "danger")
    
    return render_template("publisher/dashboard.html")



@app.route("/publisher/<s_id>/save_instance", methods=["POST"])
def save_instance(s_id):
    #Results from user input on localize
    req = request.get_json()
    print()
    print("Received: ")
    print(req)
    print()
    
    u_id = fsession["u_id"]
    print("Story id: ",s_id,", User ID: ",u_id)
    print()
    
    #Transforming Temporal and descriptions from user input
    instance = req["properties"]
    print("instance: ",instance)
    print()
    i_name = instance["eName"]
    i_desc = instance["eDesc"]
    p_name = instance["pName"]
    p_desc = instance["pDesc"]
    all_day = instance["allDay"]
    t_begin = instance["tBegin"]
    t_end = instance["tEnd"]
    t_desc = instance["tDesc"]
    e_ids = instance["eIds"]
    p_ids = instance["pIds"]
    nominatims = instance["nominatims"]

    #Extract geometry in correct format from user input
    #UGaz
    idx=0
    features = req['geometry']
    print("Features1: ",features)

    #Extract tempoarl element
    print()
    print("All day? ",all_day)
    print("t_begin before: ",t_begin)
    print("t_end before: ",t_end)
    print()
    if all_day in ["date"]:
        t_begin = t_begin+"T00:00"
        t_end = t_end+"T23:59"
    print("t_begin type: ",type(t_begin))
    print("t_begin: ",t_begin)
    print("t_end type: ",type(t_end))
    print("t_end: ",t_end)

    #Extract e_ids
    print("e_ids: ",e_ids)

    #Extract p_ids
    print("p_ids: ",p_ids)

    #Define connection
    con = psycopg2.connect("dbname=postgres user=postgres password=thesis21") #previous password: thesis2021
    
    #BEGIN EDITS
    try:
        with con:
            with con.cursor() as cur:
                #Save new instance
                cur.execute("""
                    INSERT INTO apregoar.instances (t_begin, t_end, t_desc, p_desc, s_id, u_id, t_type, p_name,created,edited,i_name,i_desc) 
                    VALUES (%(t_begin)s, %(t_end)s, %(t_desc)s, %(p_desc)s, %(s_id)s, %(u_id)s, %(t_type)s, %(p_name)s,NOW(),NOW(),%(i_name)s,%(i_desc)s)
                    RETURNING i_id
                    ;""",
                    {'t_begin':t_begin, 't_end':t_end, 't_desc':t_desc, 'p_desc':p_desc, 's_id':s_id, 'u_id':u_id, 't_type':all_day,'p_name':p_name, 'i_name':i_name,'i_desc':i_desc}
                )
                i_id = cur.fetchone()[0]
                print("Instance added to database. i_id: ",i_id)
                instance["i_id"]=i_id

                #Extract and Save UGaz (if exists)
                if features:
                    print("There are UGaz features")
                    features = json.loads(features)
                    print("Features: ")
                    print(features)
                    multiShape=[]
                    shapeP = None
                    #Prepare feature geometry
                    all_coords = features['coordinates']
                    print("all_coords",all_coords)
                    for i in range(len(all_coords)):
                        shape_coords = all_coords[i]
                        print(shape_coords)
                        shapeP = Polygon(shape_coords)
                        multiShape.append(shapeP)
                    print("Length of Multishape (number of polygons): ", len(multiShape))
                    multiP = MultiPolygon(multiShape)
                    print("# polys in MultiP: ",len(multiP.geoms))
                    print("multiP wkt: ",multiP.wkt)
                    new_geom = 'SRID=4326;'+multiP.wkt
                    print(new_geom)
                    
                    #Save place to database
                    cur.execute("""
                        INSERT INTO apregoar.ugazetteer (p_name, geom, u_id, p_desc,created,edited) 
                        VALUES (%(p_name)s, ST_GeomFromEWKT(%(geom)s), %(u_id)s, %(p_desc)s,NOW(),NOW())
                        RETURNING p_id
                        ;""",
                        {'p_name':p_name, 'geom':multiP.wkt, 'u_id':u_id, 'p_desc':p_desc}
                    )
                    p_id = cur.fetchone()[0]
                    instance["p_id"] = p_id
                    print("Custom place added to database. p_id: ",p_id)
                    instance["p_id"] = p_id
                    #Relate instance and new place
                    cur.execute("""
                        INSERT INTO apregoar.instance_ugaz (i_id, p_id, original)
                        VALUES (%(i_id)s, %(p_id)s, %(original)s)
                        ;""",
                        {'i_id':i_id, 'p_id':p_id,'original':True}
                    )
                    print("Custome place successfully related to instance")

                    #Find related geometries
                    cur.execute("""
                        SELECT
                            ugaz.p_id AS p_id,
                            egaz.e_id AS e_id,
                            ST_Contains(ST_Makevalid(ugaz.geom), ST_Makevalid(egaz.geom)) AS u_contains_e,
                            ST_Within(ST_Makevalid(ugaz.geom), ST_Makevalid(egaz.geom)) AS u_within_e,
                            ST_Overlaps(ST_Makevalid(ugaz.geom), ST_Makevalid(egaz.geom)) AS u_overlaps_e,
                            ST_Touches(ST_Makevalid(ugaz.geom), ST_Makevalid(egaz.geom)) AS u_touches_e
                        FROM 
                            apregoar.ugazetteer ugaz, 
                            apregoar.egazetteer egaz
                        WHERE
                            ugaz.p_id = %(p_id)s AND
                            ST_Intersects(ST_Makevalid(ugaz.geom), ST_Makevalid(egaz.geom))
                        ;""",
                        {'p_id':p_id}
                    )
                    records = cur.fetchall()
                    for row in records:
                        g_rel = ""
                        egaz_id = row[1]
                        print("row[1]: ",row[1])
                        print("Type of boolean (row[3]): ",type(row[3]))
                        print("row: ",row)
                        if row[2] == True:
                            g_rel = "u_contains_e"
                        elif row[3] == True:
                            g_rel = "u_within_e"
                        elif row[4] == True:
                            g_rel = "u_overlaps_e"
                        elif row[5] == True:
                            g_rel = "u_touches_e"
                        else:
                            print("No ST_Intersect relation here")
                            break
                        print("entry: ",p_id,",",egaz_id,",",g_rel)
                        cur.execute("""
                            INSERT INTO apregoar.spatial_assoc (p_id, e_id, relation) 
                            VALUES (%(p_id)s, %(e_id)s, %(relation)s)
                            ;""",
                            {'p_id':p_id, 'e_id':egaz_id, 'relation':g_rel}
                        )
                        print("1 relation added")

                    
                
                else:
                    print("No new features created")
                    p_id = None

                ### Setting up Nominatim table
                if nominatims:
                    print("nominatims: ",nominatims)
                    for place in nominatims:
                        osm_id = place["id"]
                        name = place["name"]
                        nomExists = False
                        geojson = json.dumps(place["geojson"])
                        print("type of geojson: ",type(geojson))
                        all_coords= place["geojson"]["coordinates"]
                        multiShape = []
                        for i in range(len(all_coords)):
                            shape_coords = all_coords[i]
                            shapeP = Polygon(shape_coords)
                            multiShape.append(shapeP)
                        multiP= MultiPolygon(multiShape)
                        
                    
                        cur.execute("""
                            SELECT *
                            FROM apregoar.ngazetteer
                            WHERE osm_id = %(osm_id)s
                            ;""",
                            {'osm_id':osm_id}
                        )
                        records = cur.fetchall()
                        for row in records:
                            n_id = row[0]
                            print("n_id: ",n_id)
                            nomExists = True
                        if nomExists == False:
                            print("ngazetteer entry doesn't exists yet")
                            cur.execute("""
                                INSERT INTO apregoar.ngazetteer (n_name, geom, osm_id, geojson) 
                                VALUES (%(n_name)s, ST_GeomFromEWKT(%(geom)s), %(osm_id)s, %(geojson)s)
                                RETURNING n_id
                                ;""",
                                {'n_name':name, 'geom':'SRID=4326;'+multiP.wkt, 'osm_id':osm_id, 'geojson':geojson}
                            )
                            print("checkpoint")
                            n_id = cur.fetchone()[0]
                            print("n_id after new entry save: ", n_id)

                            #Find related geometries
                            cur.execute("""
                                SELECT
                                    ngaz.n_id AS n_id,
                                    egaz.e_id AS e_id,
                                    ST_Contains(ST_Makevalid(ngaz.geom), ST_Makevalid(egaz.geom)) AS contains_e,
                                    ST_Within(ST_Makevalid(ngaz.geom), ST_Makevalid(egaz.geom)) AS within_e,
                                    ST_Overlaps(ST_Makevalid(ngaz.geom), ST_Makevalid(egaz.geom)) AS overlaps_e,
                                    ST_Touches(ST_Makevalid(ngaz.geom), ST_Makevalid(egaz.geom)) AS touches_e
                                FROM 
                                    apregoar.ngazetteer ngaz, 
                                    apregoar.egazetteer egaz
                                WHERE
                                    ngaz.n_id = %(n_id)s AND
                                    ST_Intersects(ST_Makevalid(ngaz.geom), ST_Makevalid(egaz.geom))
                                ;""",
                                {'n_id':n_id}
                            )
                            records = cur.fetchall()
                            for row in records:
                                g_rel = ""
                                egaz_id = row[1]
                                print("row[1]: ",row[1])
                                print("Type of boolean (row[3]): ",type(row[3]))
                                print("row: ",row)
                                if row[2] == True:
                                    g_rel = "contains_e"
                                elif row[3] == True:
                                    g_rel = "within_e"
                                elif row[4] == True:
                                    g_rel = "overlaps_e"
                                elif row[5] == True:
                                    g_rel = "touches_e"
                                else:
                                    print("No ST_Intersect relation here")
                                    break
                                print("entry: ",n_id,",",egaz_id,",",g_rel)
                                cur.execute("""
                                    INSERT INTO apregoar.spatial_assoc_n (n_id, e_id, relation) 
                                    VALUES (%(n_id)s, %(e_id)s, %(relation)s)
                                    ;""",
                                    {'n_id':n_id, 'e_id':egaz_id, 'relation':g_rel}
                                )
                                print("1 relation added")
                            
                        #Relate instance and new place
                        cur.execute("""
                            INSERT INTO apregoar.instance_ngaz (i_id, n_id)
                            VALUES (%(i_id)s, %(n_id)s)
                            RETURNING n_id, i_id
                            ;""",
                            {'i_id':i_id, 'n_id':n_id,}
                        )
                        results = cur.fetchone()[0]
                        #for result in results:
                        #    print("i_id, n_id",result["i_id"]+result["n_id"])
                        print("Nominatim place successfully related to instance")


                #Associate any existing administrative gazetteers
                print("e_ids: ",e_ids)
                if e_ids:
                    print("e_ids: ",e_ids)
                    for e_id in e_ids:
                        print("e_id",e_id)
                        cur.execute("""
                            INSERT INTO apregoar.instance_egaz (i_id, e_id, explicit,last_edited)
                            VALUES (%(i_id)s, %(e_id)s, %(explicit)s,NOW())
                            ;""",
                            {'i_id':i_id, 'e_id':e_id,'explicit':True}
                        )
                    print("Successfully associated ",len(e_ids)," existing admin features")
                else:
                    print("no admin features associated")
                
                #Associate any existing user created gazetteers
                print("p_ids",p_ids)
                if p_ids:
                    print("p_ids: ",p_ids)
                    for id in p_ids:
                        print("p_id (existing)",id)
                        cur.execute("""
                            INSERT INTO apregoar.instance_ugaz (i_id, p_id, original)
                            VALUES (%(i_id)s, %(p_id)s, %(original)s)
                            ;""",
                            {'i_id':i_id, 'p_id':id,'original':False}
                        )
                    print("Successfully associated ",len(p_ids)," previous ugaz features")
                else:
                    print("No association to previous ugaz features")                        
    except psycopg2.Error as e:
        print("Error in saving new instance")
        print(e.pgerror)
        print(e.diag.message_primary)
        res = make_response(jsonify(req), 500)
        con.rollback()
        con.close()
        return res
    else:
        #Commit all additions to database
        try:
            with engine.connect() as conn:
                SQL = text("SELECT p_id FROM apregoar.publicationing WHERE story_id = :x")
                SQL = SQL.bindparams(x=s_id)
                print("SQL: ",SQL)
                result = conn.execute(SQL)
                if result:
                    print("Result returned")
                    for i in result:
                        publication_id = i["p_id"]
                        pub_query = "REFRESH MATERIALIZED VIEW apregoar.geonoticias_"+str(publication_id)+";"
                        print("pub_query: ",pub_query)
            with con:
                with con.cursor() as cur:
                    cur.execute("REFRESH MATERIALIZED VIEW apregoar.publication_info")
                    print("Print successfully refreshed ")
                    cur.execute("REFRESH MATERIALIZED VIEW apregoar.geonoticias")
                    print("Refreshed geonoticias materialized view")
                    cur.execute(pub_query)
                    print(pub_query)
        except:
            print("unsuccessful refresh of materialized views")
        else:
            con.commit()
            con.close()
            print("Successful save of instance and related places") 
    res = make_response(jsonify(req), 200) 
    return res

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'shp'}
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

