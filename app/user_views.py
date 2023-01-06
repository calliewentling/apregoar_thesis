from app import app
from datetime import datetime
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from flask import Flask, g, render_template, request, flash, jsonify, make_response, json, request, jsonify, make_response, render_template, session as fsession, redirect, url_for
import psycopg2

from app import engine, session, text


@app.route("/")
def index():
    return render_template("user/index.html")

#########################
###### User login
#########################

@app.route("/<login_source>/sign_up", methods=["GET","POST"])
def sign_upU(login_source):
    if request.method == "POST":
        req = request.form
        missing = list()

        newPub = request.form.get("createNewPub")
        print("newPub: ",newPub)

        for k, v in req.items():
            if v =="":
                if k == "affiliation":
                    if newPub == "createNewPub":
                        missing.append(k)
                else:
                    missing.append(k)
        print("missing: ",missing)
        if missing:
            feedback = f"Falta campos para {', '.join(missing)}"
            print(feedback)
            publications = load_pubs()
            return render_template("user/sign_up.html", publications = publications, feedback=feedback)
        
        username = request.form.get("username")
        password = request.form.get("password")
        email = request.form.get("email")
        organization = request.form.get("affiliation").lower()

        try:
            with engine.connect() as conn:
                print(username)
                SQL = text("SELECT username FROM apregoar.users WHERE username = :x")
                SQL = SQL.bindparams(x=username)
                result = conn.execute(SQL)
        except:
            print("Error in validating unique username")
            feedback=f"Erro"
        else:
            count = 0
            for row in result:
                print("username:",row['username'])
                count += 1
            print(count)
            if count == 0:
                con = psycopg2.connect("dbname=postgres user=postgres password=thesis2021")
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
                            cur.execute("REFRESH MATERIALIZED VIEW apregoar.publication_info")
                            print("Print successfully refreshed ")
                            cur.execute("REFRESH MATERIALIZED VIEW apregoar.geonoticias")
                            print("Refreshed geonoticias materialized view")
                except:
                    print("Error in saving new user")
                    feedback=f"Erro"
                    con.rollback()
                    con.close()
                else:
                    print("User added to database")
                    if newPub == "createNewPub":
                        print("New publication to add to database")
                        try:
                            with con:
                                with con.cursor() as cur:
                                    cur.execute("""
                                        INSERT INTO apregoar.publications (publication_name)
                                        VALUES (%(publication_name)s)
                                        RETURNING publication_id
                                        ;""",
                                        {'publication_name':organization}
                                    )
                                    p_id = cur.fetchone()[0]
                                    print("New publication id: ",p_id)
                                    cur.execute("REFRESH MATERIALIZED VIEW apregoar.publication_info")
                                    print("Print successfully refreshed ")
                                    cur.execute("REFRESH MATERIALIZED VIEW apregoar.geonoticias")
                                    print("Refreshed geonoticias materialized view")
                                    cur.execute(
                                        "CREATE MATERIALIZED VIEW IF NOT EXISTS apregoar.geonoticias_%(publication_id)s AS SELECT * FROM apregoar.geonoticias WHERE %(publication_id)s = ANY(publication_id) WITH DATA;",
                                        {'publication_id': p_id}
                                    )
                                    print("successfully created new pub-specific geonoticias materialized view for publication id: ",p_id)
                        except:
                            print("error adding new publication")
                            con.rollback()
                            con.close()
                            publications = load_pubs()
                            feedback = f"Erro na associação da organização"
                            return render_template("user/sign_up.html",publications = publications, feedback = feedback)
                    else:
                        print("using a pre-existing publication")
                        p_id = int(request.form.get("selectExistingPub"))
                        print("p_id: ",p_id)
                    try:
                        with con:
                            with con.cursor() as cur:
                                print("associating affiliation to user")
                                cur.execute("""
                                    INSERT INTO apregoar.user_affil (u_id, p_id)
                                    VALUES (%(u_id)s,%(p_id)s)
                                    ;""",
                                    {'u_id':int(u_id), 'p_id':int(p_id)}
                                )
                                print("associated affiliation to user")
                                #u_id_conf = cur.fetchone()[0]
                                #print("u_id_conf: ",u_id_conf)
                                cur.execute("REFRESH MATERIALIZED VIEW apregoar.publication_info")
                                print("Print successfully refreshed ")
                                cur.execute("REFRESH MATERIALIZED VIEW apregoar.geonoticias")
                                print("Refreshed geonoticias materialized view")
                    except psycopg2.Error as e:
                        print("e: ",e)
                        print("e.pgerror:  ",e.pgerror)
                        print("e.diag.message_primary: ", e.diag.message_primary)
                        print("error associating user to publication")
                        con.rollback()
                        con.close()
                        feedback = f"Erro na associação da organização"
                        publications = load_pubs()
                        return render_template("user/sign_up.html", publications = publications, feedback=feedback)
                    else:
                        print("Success in publisher affiliation to user!")
                        con.commit()
                        con.close()
                    return redirect(url_for("sign_inU", login_source = "publisher"))
            else:
                feedback=f"O username já existe. Seleciona um novo username, se faz favor."
                return render_template("user/sign_up.html", publications = publications, feedback=feedback)
    
    #WHEN FIRST LOADING THE PAGE
    publications = load_pubs()
    return render_template("user/sign_up.html", publications = publications)
def load_pubs():
    try:
        with engine.connect() as conn:
            SQL = text("SELECT * FROM apregoar.publications")
            result = conn.execute(SQL)
    except:
        publications = []
        print("no publications loaded")
        return render_template("user/sign_up.html", publications = publications)
    else:    
        publications = []
        for r in result:
            pub = {
                'p_id': r["publication_id"],
                'p_name': r["publication_name"],
            }
            publications.append(pub)
        #publications = json.dumps(publications, ensure_ascii=False)
        print("publications: ",publications)
        return publications
    

@app.route("/<login_source>/sign_in", methods=["GET", "POST"])
def sign_inU(login_source):
    print("sign_inU")
    
    if request.method == "POST":
        req = request.form
        username = req.get("username")
        password = req.get("password")
        print("Entered username: ", username)
        print("Entered password: ", password)
        try:
            with engine.connect() as conn:
                SQL = text("SELECT users.u_id, users.organization, users.username, users.email, array_agg(user_affil.p_id) AS p_ids FROM apregoar.users LEFT JOIN apregoar.user_affil ON users.u_id = user_affil.u_id WHERE username = :x and password = :y GROUP BY users.u_id, organization, username, email")
                SQL = SQL.bindparams(x=username, y=password)
                print(SQL)
                result = conn.execute(SQL)   
                print("SQL executed")
        except:
            print("Error in validating username password combo")
            feedback = f"Erro"
        else:
            user = {}
            for row in result:
                user = {
                    username: {
                        "username": row['username'],
                        "affiliation": row['organization'],
                        "email": row['email'],
                        "u_id": row['u_id'],
                        "p_ids": row['p_ids']
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
                fsession['p_ids'] = user[username]["p_ids"]
                print("fsession: ",fsession)
                session.modified = True
                print("Session user assigned")
                if login_source == "publisher":
                    return redirect(url_for("publisher_dashboard"))
                else:
                    return render_template("user/profile.html",user=fsession)    
            else:
                print("Combo not found")
                feedback = f"Username/password combination not found. Please try again."
                return render_template("user/sign_in.html", feedback=feedback)

    return render_template("user/sign_in.html")

@app.route("/<login_source>/sign_out")
def sign_outU(login_source):
    fsession.pop("username", None)
    fsession.pop("email", None)
    fsession.pop("u_id", None)
    fsession.pop("org", None)
    fsession.pop("p_ids",None)
    print("fsession: ",fsession)
    return redirect(url_for("sign_inU", login_source = login_source))

@app.route("/user/profile")
def render_profile():
    print('fsession exists: ',fsession)
    print("length of fsession: ",len(fsession))
    if len(fsession) > 0:
        return render_template("user/profile.html", user=fsession)
    else: 
        return redirect(url_for("sign_inU", login_source = 'user'))
